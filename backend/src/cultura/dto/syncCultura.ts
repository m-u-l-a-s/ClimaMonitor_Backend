import { CulturaDocument } from "../entities/cultura.entity"

export class syncCultura {
    cultura : ChangesWatermelon

    constructor(){}

    setCultura(data : ChangesWatermelon){
        this.cultura = data
    }

    getCultura() : ChangesWatermelon{
        return this.cultura
    }
}

export type ChangesWatermelon = {
    created : CulturaDocument[]
    updated : CulturaDocument[]
    deleted : String[]
}