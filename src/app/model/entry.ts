import { ServerLog } from './server-log';

export class Entry {
	// demo entry property
	logEntry: ServerLog;
	leaderId: number;
	term: number;
	isHeartBeat: boolean = true;
}