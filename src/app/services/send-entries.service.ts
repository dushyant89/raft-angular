import { Injectable } from '@angular/core';
import { Subject } from 'rxjs/Subject';

@Injectable()
export class SendEntriesService {
    private sendEntrySource = new Subject<String>();
    sendEntrySource$ = this.sendEntrySource.asObservable();
    
    sendEntry(entry: String): void {
        this.sendEntrySource.next(entry);
    }
}