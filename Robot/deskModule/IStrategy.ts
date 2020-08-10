import { MJPlayerData } from './../../shared/mjData/MJPlayerData';
import { eMJActType } from './../../shared/mjData/MJDefine';
export interface IStrategy
{
    getChuCard( data : MJPlayerData ) : number ;
    onDecideActWithOtherCard( data : MJPlayerData, actOpts : eMJActType[] ) : eMJActType ;
    onDecideActWithSelfCard( data : MJPlayerData, actOpts : eMJActType[] ) : eMJActType ;
}