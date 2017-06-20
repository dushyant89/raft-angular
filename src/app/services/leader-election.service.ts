import { Injectable } from '@angular/core';
import { Subject } from 'rxjs/Subject';
import { VoteRequest } from '../model/vote-request';
import { VoteRequestResponse } from '../model/vote-request-response';

@Injectable()
export class LeaderElectionService {
	// Observable sources
	private requestVoteSource = new Subject<VoteRequest>();
	private sendVoteSource = new Subject<VoteRequestResponse>();

	// Observable streams
	voteRequested$ = this.requestVoteSource.asObservable();
	voteSent$ = this.sendVoteSource.asObservable();

	requestVote(voteRequest: VoteRequest): void {
		this.requestVoteSource.next(voteRequest);
	}
	
	sendVote(vote: VoteRequestResponse): void {
		this.sendVoteSource.next(vote);
	}
}