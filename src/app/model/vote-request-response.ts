export class VoteRequestResponse {
	term: number;
	voteGranted: boolean;
	forCandidate: number;
	lastLogIndex: number;
}