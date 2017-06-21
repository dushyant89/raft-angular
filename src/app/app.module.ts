import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { AppComponent } from './components/app.component';
import { ServerComponent } from './components/server.component';
import { LeaderElectionService } from './services/leader-election.service';
import { AppendEntriesService } from './services/append-entries.service';
import { SendEntriesService } from './services/send-entries.service';

@NgModule({
    imports:    [ BrowserModule, FormsModule ],
    declarations:   [ AppComponent, ServerComponent ],
    bootstrap:  [ AppComponent ],
    providers:  [ LeaderElectionService, AppendEntriesService, SendEntriesService ]
})
export class AppModule {}