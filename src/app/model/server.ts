export class Server {
    id: number;
    follower: boolean = true;
    leader: boolean = false;
    candidate: boolean = false;
    electionTimeout: number;
    appendEntryTimeout: number = 200;
    currentTerm: number = 0;
    // -1 means did not vote for anyone.
    votedFor: number = -1;

    private generateElectionTimeout(min: number, max: number): number {
        max = Math.floor(max);
        min = Math.ceil(min);
        
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    constructor() {
        this.electionTimeout = this.generateElectionTimeout(500, 1200);
    }
}
