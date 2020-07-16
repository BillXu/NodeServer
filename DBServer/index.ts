import { Application } from './../common/Application';
import { DBSvr } from './DBSvr';
let ap = new Application();
 ap.init(new DBSvr()) ;
