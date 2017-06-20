import { Component } from '@angular/core';
import { Server } from '../model/server';
import { SendEntriesService } from '../services/send-entries.service';

@Component({
	selector: 'raft-app',
	styleUrls: ['app/styles/app.component.css'],
	templateUrl: 'app/templates/app.component.html'
})
export class AppComponent {
	noOfServers: number;
	servers: Server[];
	userEntry: String;
	allowUserEntries: boolean = false;

	createServers(): void {
		if (undefined !== this.noOfServers) {
			this.servers = new Array();
			for (let i: number = 0; i < this.noOfServers; i++) {
				let server: Server = new Server();
				server.id = i + 1;
				this.servers.push(server);
			}
		} else {
			alert("Enter some number");
		}
	}

	constructor(private sendEntriesService: SendEntriesService) {}

	sendEntriesToServers(): void {
		this.sendEntriesService.sendEntry(this.userEntry);
	}

	onLeaderElected(value: boolean): void {
		this.allowUserEntries = value;
	}
}