import { XLogger } from './../common/Logger';
import { TestClientNet } from './GateSvr';
import { TestCommon } from '../common/test';
export class TestPwd
{
    p : TestClientNet = null ;
    printC()
    {
        let t = new TestCommon();
        t.printA();
        console.log( "testPwdss" );
    }

    init()
    {
        XLogger.debug("test pwd ") ;
        this.p = new TestClientNet();
        this.p.init();
    }
}