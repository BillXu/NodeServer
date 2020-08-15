export class SVR_ARG
{
    static isDebug : boolean = true ;
    static useConsoleLog : boolean = false ;
    static svrCfgUrl : string = SVR_ARG.isDebug ? "http://192.168.6.168:8087/mobile/getServerConfig" : "http://139.224.239.22/mobile/getServerConfig" ;
    static matchCfgUrl : string = SVR_ARG.isDebug ? "http://192.168.6.168:8087/mobile/getMatchList" : "http://139.224.239.22/mobile/getMatchList" ;
}