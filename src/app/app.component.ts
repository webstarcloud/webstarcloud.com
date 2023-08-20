import { Component } from '@angular/core';



@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'WebstarCloud';

  // activeTab = 'search';

  search(activeTab: string){
    // var state = false;
    // console.log(activeTab)
    // if(activeTab == "builds")
    //   state = true;
    //   location.reload()
    // this.activeTab = activeTab;
  }
  
  // changeActiveTab(name: string){this.activeTab = name;}
   
}
