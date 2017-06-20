export class VoteRequest {
	term: number;
	candidateId: number;
	lastLogIndex: number;
	lastLogTerm: number;
}