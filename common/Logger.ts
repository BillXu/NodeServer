import { configure, getLogger, Logger } from "log4js";
export class XLogger
{
    protected static s_use_console = true ;
    protected loger : Logger = null  ;
    protected static s_logger : XLogger = null ;

    protected static getInstance()
    {
        if ( null == XLogger.s_logger )
        {
            XLogger.s_logger = new XLogger();
            XLogger.s_logger.init();
        }
        return XLogger.s_logger ;
    }

    protected init()
    {
        // configure({
        // appenders: { cheese: { type: "file", filename: "cheese.log" } },
        // categories: { default: { appenders: ["cheese"], level: "error" } }
        // });
        const logger = getLogger();
        logger.level = "debug";
        logger.debug("Some debug messages");
        logger.info("this is a info") ;
        this.loger = logger;
    }

    static debug( str : string )
    {
        if ( XLogger.s_use_console )
        {
            console.log( XLogger.timeStr() + str );
        }
        else
        {
            XLogger.getInstance().loger.debug(str);
        }
    }

    static info( str : string )
    {
        if ( XLogger.s_use_console )
        {
            console.info( XLogger.timeStr() + str  );
        }
        else
        {
            XLogger.getInstance().loger.info(str);
        }
    }

    static warn( str : string )
    {
        if ( XLogger.s_use_console )
        {
            console.info( XLogger.timeStr() + str );
        }
        else
        {
            XLogger.getInstance().loger.warn(str);
        }
    }

    static error( str : string )
    {
        if ( XLogger.s_use_console )
        {
            console.error( XLogger.timeStr() + str );
        }
        else
        {
            XLogger.getInstance().loger.error(str);
        }
    }

    protected static timeStr()
    {
        let t = new Date();
        let year = t.getFullYear();//获取完整的年份(4位,1970-????)
        let month = t.getMonth() + 1;//获取当前月份(0-11,0代表1月)
        let day = t.getDate();//获取当前日(1-31)
        let h = t.getHours();
        let m = t.getMinutes();
        let s = t.getSeconds();
        let S = t.getMilliseconds();

        return "[ " + year + "-" + month + "-" + day + " " + h + ":" + m + ":" + s + "." + S + " ] - " ;
    }

}



