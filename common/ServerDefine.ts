export class SVR_ARG
{
    static isDebug : boolean = true ;
    static useConsoleLog : boolean = false ;
    static svrCfgUrl : string = SVR_ARG.isDebug ? "http://192.168.6.168:8087/mobile/getServerConfig" : "http://47.100.188.244/mobile/getServerConfig" ;
    static matchCfgUrl : string = SVR_ARG.isDebug  ? "http://192.168.6.168:8087/mobile/getMatchList" : "http://47.100.188.244/mobile/getMatchList" ;
}