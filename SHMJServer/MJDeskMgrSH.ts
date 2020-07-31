import { MJDeskSH } from './MJDeskSH';
import { IDesk } from './../common/MJ/IDesk';
import { DeskMgr } from './../common/MJ/DeskMgr';
export class MJDeskMgrSH extends DeskMgr
{
    createDesk() : IDesk 
    {
        return new MJDeskSH();
    }
}