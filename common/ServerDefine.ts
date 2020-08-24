export class SVR_ARG
{
    static isDebug : boolean = true ;
    static isInNet : boolean = true ;
    static useConsoleLog : boolean = true ;
    static svrCfgUrl : string = SVR_ARG.isInNet ? "http://192.168.6.168:8087/mobile/getServerConfig" : "http://47.100.188.244/mobile/getServerConfig" ;
    static matchCfgUrl : string = SVR_ARG.isInNet  ? "http://192.168.6.168:8087/mobile/getMatchList" : "http://47.100.188.244/mobile/getMatchList" ;
    static gateForRoBot : string = SVR_ARG.isInNet ? "ws://localhost:3001" : "ws://47.100.188.244:3001" ;
    static prizeWheelCfgUrl : string = "http://192.168.6.168:8087/mobile/getTurntableConfig" ; 
    static notifyUrl : string = "http://192.168.6.168:8087/cmd" ;
    static mailKeepTime : number = SVR_ARG.isDebug ? ( 1000 * 60 * 2 ) : (1000 * 60 * 60 * 24 * 7) ;  // 2 minite or 7 days ;
}