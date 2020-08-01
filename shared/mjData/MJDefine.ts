export enum eMJCardType
{
	eCT_None,
	eCT_Wan,
	eCT_Tong,
	eCT_Tiao,
	eCT_Feng,  // 1 dong , 2 nan , 3 xi  4 bei 
	eCT_Jian, // 1 zhong , 2 fa , 3 bai 
	eCT_Hua, 
    eCT_Max,
};

export enum eMJActType
{
	eMJAct_None,
	eMJAct_Mo = eMJAct_None, // 摸牌
	eMJAct_Pass, //  过 
	eMJAct_Chi, // 吃
	eMJAct_Peng,  // 碰牌
	eMJAct_MingGang,  // 明杠
	eMJAct_AnGang, // 暗杠
	eMJAct_BuGang_Declare, // 声称要补杠 
	eMJAct_BuGang_Done, //  补杠第二阶段，执行杠牌
	eMJAct_Hu,  //  胡牌
	eMJAct_Chu, // 出牌
	eMJAct_Ting,
	eMJAct_Max,
};

export enum eEatType
{
	eEat_Left , // xAB
	eEat_Middle,// AxB
	eEat_Righ, // ABX,
}

export enum eFanxingMJ
{
	ePingHu = 0 ,
	eHunYiSe = 1,
	eQingYiSe = 1 << 1,
	ePengPengHu = 1 << 2,
	eDaDiaoChe = 1 << 3,
	eMengQing = 1 << 4,
	eGangKai = 1 << 5,
	eQiangGang = 1 << 6,
	eWuHuaGuo = 1 << 7 ,
	eQingPeng = eFanxingMJ.eQingYiSe | eFanxingMJ.ePengPengHu,
	eHunPeng = eFanxingMJ.eHunYiSe | eFanxingMJ.ePengPengHu,
}