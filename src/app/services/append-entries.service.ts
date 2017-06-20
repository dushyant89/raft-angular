import { Injectable } from '@angular/core';
import { Subject } from 'rxjs/Subject';
import { Entry } from '../model/entry';

@Injectable()
export class AppendEntriesService {
	private entrySource = new Subject<Entry>();
	entrySource$ = this.entrySource.asObservable();
	
	sendEntry(entry: Entry): void {
		this.entrySource.next(entry);
	}
}