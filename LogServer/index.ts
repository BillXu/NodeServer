import { LogSvr } from './LogSvr';
import { Application } from './../common/Application';
let ap = new Application();
 ap.init( new LogSvr() ) ;
