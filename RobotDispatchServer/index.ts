import { RobotDispatchSvr } from './RobotDispatchServer';
import { Application } from './../common/Application';
let ap = new Application();
 ap.init( new RobotDispatchSvr() ) ;
