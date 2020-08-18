export class SVR_ARG
{
    static isDebug : boolean = true ;
    static isInNet : boolean = false ;
    static useConsoleLog : boolean = false ;
    static svrCfgUrl : string = SVR_ARG.isInNet ? "http://192.168.6.168:8087/mobile/getServerConfig" : "http://47.100.188.244/mobile/getServerConfig" ;
    static matchCfgUrl : string = SVR_ARG.isInNet  ? "http://192.168.6.168:8087/mobile/getMatchList" : "http://47.100.188.244/mobile/getMatchList" ;
    static gateForRoBot : string = SVR_ARG.isInNet ? "ws://localhost:3001" : "ws://47.100.188.244:3001" ;
}