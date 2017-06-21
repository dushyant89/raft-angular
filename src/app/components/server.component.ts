import { Component, Input, OnInit, Output, EventEmitter} from '@angular/core';
import { Server } from '../model/server';
import { ServerLog } from '../model/server-log';
import { LeaderElectionService } from '../services/leader-election.service';
import { AppendEntriesService } from '../services/append-entries.service';
import { SendEntriesService } from '../services/send-entries.service';
import { Subscription } from 'rxjs/Subscription';
import { VoteRequest } from '../model/vote-request';
import { VoteRequestResponse } from '../model/vote-request-response';
import { Entry } from '../model/entry';

@Component({
    selector: 'raft-server',
    styleUrls: ['app/styles/server.component.css'],
    templateUrl: 'app/templates/server.component.html'
})
export class ServerComponent implements OnInit {
    /**
        Inject the server instance
    */
    @Input() server: Server;
    @Input() noOfServers: number;
    @Output() onLeaderElected = new EventEmitter<boolean>();
    // Private variables.
    private logs: ServerLog[] = [];
    private messageLogs: string[] = [];
    private noOfVotes: number = 0;
    private heartbeatLastReceived: number = 0;
    private enableLogging: boolean = true;

    /**
        When the component is initialized start the timer.
    */
    ngOnInit(): void {
        this.setElectionTimer();
    }

    constructor(
        private leaderElectionService: LeaderElectionService,
        private appendEntriesService: AppendEntriesService,
        private sendEntriesService: SendEntriesService
    ) {
        /**
            Some server has requested for a vote.
        */
        leaderElectionService.voteRequested$.subscribe((request: VoteRequest) => {
            this.handleVoteRequest(request);
        });
        
        /**
            Some server has acknowledged the vote request.
        */
        leaderElectionService.voteSent$.subscribe((response: VoteRequestResponse) => {
            this.handleVoteResponse(response);
        });

        /**
            Listen to the heartbeat/entries sent by leader.
        */
        appendEntriesService.entrySource$.subscribe((entry: Entry) => {
            this.handleHeartBeats(entry);
        });

        /**
            Any entries sent by user should be replicated to other servers.
        */
        sendEntriesService.sendEntrySource$.subscribe((userEntry: string) => {
            if (this.server.leader) {
                this.handleUserEntries(userEntry);
            }
        });
    }

    /**
        Any entries which are sent by user should be sent to follower servers
        by the leader.
    */
    private handleUserEntries(userEntry: string): void {
        let log = new ServerLog();
        log.term = this.server.currentTerm;
        log.data = userEntry;
        // Send the user entry to all followers.
        this.appendEntriesService.sendEntry(this.appendEntryRequest(log));
    }

    /**
        Method to handle the heartbeats/entries sent
        by leader.
    */
    private handleHeartBeats(entry: Entry): void {
        /**
            If you are not a leader then only react to heartbeats.
        */
        if (!this.server.leader) {
            // Since we are receiving heartbeats so reset this value.
            this.server.currentTerm = entry.term;
            // These values need to be reset for avoiding confusions
            // during elections.
                this.server.votedFor = -1;
                this.noOfVotes = 0;
            this.heartbeatLastReceived = Date.now();
            if (!entry.isHeartBeat) {
                // Update your log with the latest data from server.
                this.logs.push(entry.logEntry);
                this.logMessages("Got this from the server: " + entry.logEntry.data);
            }
        }
    }

    /**
        Method to handle the request for vote.
    */
    private handleVoteRequest(request: VoteRequest): void {
        // For avoiding the vote request to self.
        if (this.server.id != request.candidateId) {
            let voteRequestResponse = new VoteRequestResponse();
            voteRequestResponse.voteGranted = this.isVoteRequestEligible(request);
            if (voteRequestResponse.voteGranted) {
                this.server.votedFor = request.candidateId;
            }
            voteRequestResponse.term = this.server.currentTerm;
            voteRequestResponse.forCandidate = request.candidateId;
            this.leaderElectionService.sendVote(voteRequestResponse);
            this.logMessages("just received vote request from: " + request.candidateId);
        }
    }

    /**
        Method to deal with vote response.
    */
    private handleVoteResponse(response: VoteRequestResponse): void {
        if (this.server.candidate && this.server.id == response.forCandidate) {
            if (response.voteGranted) {
                this.noOfVotes++;
                this.logMessages("just received a positive vote");
                // If majority has been established.
                if (this.noOfVotes > this.noOfServers/2) {
                    this.startLeadership();
                }
            } else if (response.term < this.server.currentTerm || this.logs.length < response.lastLogIndex) {
                /**
                    If vote is not granted convert to a follower. The reason
                    why vote is not granted is because the candidate is behind.
                */
                this.server.candidate = false;
                this.server.follower = true;
            }
        }
    }

    /**
        As soon as a server is elected as a leader
        execute these tasks so as to avoid any elections because
        it's better if other servers get to know who is the leader
        immediately.
    */
    private startLeadership(): void {
        //first convert to a leader.
        this.server.leader = true;
        this.server.candidate = false;
        // reset the no. of votes.
        this.noOfVotes = 0;
        // Start sending heartbeats to followers immediately.
        this.appendEntriesService.sendEntry(this.appendEntryRequest(undefined));
        // Set the timer also.
        this.setAppendEntryTimer();
        // let the parent component know of this.
        this.onLeaderElected.emit(true);
        // Logging it finally.
        this.logMessages("I just became the leader");
    }

    /**
        Keep sending heartbeats/entries to followers in order
        to avoid any elections or partitions. 
    */
    private setAppendEntryTimer(): void {
        setInterval(
            this.appendEntriesService.sendEntry.bind(this.appendEntriesService),
            this.server.appendEntryTimeout,
            this.appendEntryRequest(undefined)
        );
    }

    private isVoteRequestEligible(request: VoteRequest): boolean {
        /**
            the server to vote has to be a follower and shouldn't
            have voted for someone else in the same voting session.
        */
        if (!this.server.follower && -1 != this.server.votedFor) {
            return false;
        }
        /**
            if the candidate has woken up from a limbo.
        */
        if (request.term < this.server.currentTerm) {
            return false;
        }
        /**
            if the candidate is not upto date with latest commands.
        */
        if (request.lastLogIndex < this.logs.length) {
            return false;
        }

        return true;
    }

    /**
        Keep buzzing for vote requests if the leader is dormant.
    */
    private setElectionTimer(): void {
        setInterval(this.initiateElection.bind(this), this.server.electionTimeout);
    }

    private initiateElection(): void {
        /**
            Only if you yourself are not a leader and the leader
            is not active then initiate election.
        */
        if (!this.server.leader && this.isLeaderDormant()) {
            /**
                Convert to candidate first.
            */
            this.convertToCandidate();
            this.leaderElectionService.requestVote(this.createVoteRequest());
            this.logMessages("I am starting an election now.");
        }
    }

    /**
        To verify whether the follower server received
        any heartbeat or not.
    */
    private isLeaderDormant(): boolean {
        let dateNow = Date.now();

        /**
            The interval of sending heartbeats is same across all servers
            so if the difference is greater than the hearbeat time then
            this server did not receive any heartbeat.
        */
        if ((dateNow - this.heartbeatLastReceived) > this.heartbeatLastReceived) {
            return true;
        }

        return false;
    }

    private convertToCandidate(): void {
        this.server.leader = this.server.follower = false;
        this.server.candidate = true;
        // vote for yourself also.
        this.noOfVotes++;
    }

    /**
        Create the vote request for followers to decide to vote.
    */
    private createVoteRequest(): VoteRequest {
        let voteRequest = new VoteRequest();
        voteRequest.term = this.server.currentTerm;
        voteRequest.candidateId = this.server.id;
        voteRequest.lastLogIndex = this.logs.length;
        /**
            This will happen when the system boots up i.e.
            none of the servers have anything.
        */
        if (0 === voteRequest.lastLogIndex) {
            voteRequest.lastLogTerm = 0;
        }

        return voteRequest;
    }

    /**
        Update the followers with the latest entries
        or send them heartbeats.
    */
    private appendEntryRequest(logEntry: ServerLog): Entry {
        let entry = new Entry();
        if (undefined === logEntry) {
            let logEntry = new ServerLog();
        } else {
            entry.isHeartBeat = false;
            this.logs.push(logEntry);
        }

        entry.leaderId = this.server.id;
        entry.term = this.server.currentTerm;
        entry.logEntry = logEntry;

        return entry;
    }

    /**
        Logs messages in message queue only if
        logging is enabled.
    */
    private logMessages(message: string): void {
        if (this.enableLogging) {
            this.messageLogs.push(new Date().toLocaleTimeString() + ":\t" + message);
        }
    }
}