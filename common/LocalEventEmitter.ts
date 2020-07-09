import { EventEmitter } from 'events';
import * as _ from "lodash" ;
class LocalEventListener
{
    target : any = null;
    listener : ( ...arg : any[] )=>void = null;
    orgListener : ( ...arg : any[] )=>void = null; 
    constructor( target : any , listener : ( ...arg : any[] )=>void )
    {
        this.target = target ;
        this.orgListener = listener ;
        this.listener = listener.bind( target ) ;
    }
}

export class LocalEventEmitter extends EventEmitter
{
    protected vRegisters : { [ key : string ] : LocalEventListener[] } = {} ;
    onWithTarget( event : string , lisener : ( ...arg : any[] )=>void , target : any  )
    {
        let L = new LocalEventListener(target,lisener) ;
        if ( this.vRegisters[event] == null )
        {
            this.vRegisters[event] = [] ;
        }
        this.vRegisters[event].push(L) ;
        this.on(event,L.listener ) ;
    }

    offWithTarget( event : string , lisener : ( ...arg : any[] )=>void , target : any )
    {
        let listeners = this.vRegisters[event] ;
        if ( listeners == null )
        {
            console.error("invalid event name = " + event ) ;
            return ;
        }

        let rm = _.remove(listeners,(l : LocalEventListener)=>{ return l.target == target && l.orgListener == lisener ;} ) ;
        for ( let r of rm )
        {
            this.off(event, r.listener ) ;
        }

        if ( listeners.length == 0 )
        {
            delete this.vRegisters[event] ;
        }
    }

    targetOff( target : any )
    {
        let events = Object.keys(this.vRegisters) ;
        for ( let ev of events )
        {
            let lisents = this.vRegisters[ev] ;            
            let rm = _.remove(lisents,(l : LocalEventListener)=>{ return l.target == target ;} ) ;
            for ( let r of rm )
            {
                this.off(ev, r.listener ) ;
            }
            if ( lisents.length == 0 )
            {
                delete this.vRegisters[ev] ;
            }
        }
    }
}