import { SVR_ARG } from './../common/ServerDefine';
import { RobotClient } from './RobotClient';
let cnt = 200;
setInterval( ()=>{
    let h = 20 ;
    while ( h -- && cnt-- >0 )
    {
        let p = new RobotClient();
        //p.init("acc130", "ws://localhost:3001" ) ;
        //p.init("acc975", "ws://localhost:3001" ) ;
        //p.init("acc899", "ws://localhost:3001" ) ;
        console.log("connect svr ") ;
        //p.init("acc9411"+cnt, "ws://139.224.239.22:3001" ) ;
        p.init("acc9411"+cnt, SVR_ARG.gateForRoBot ) ;
    }
    console.log( "---------------");
},3900 ) ;

