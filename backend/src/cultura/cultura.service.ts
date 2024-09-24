import { ConflictException, Injectable } from '@nestjs/common';
import * as nano from "nano"
import { CulturaDto } from './dto/cultura.dto';
import { CulturaEntity } from './entities/cultura.entity';

@Injectable()
export class CulturaService {

  private readonly repository: nano.DocumentScope<CulturaEntity>;

  constructor() {
    const couchdb = require("nano")(
      {
          url: "http://127.0.0.1:5984",
          requestDefaults: {
              auth: {
                  username: process.env.COUCH_USERNAME,
                  password: process.env.COUCH_PASSWORD
              }
          }
      })
    this.repository = couchdb.db.use(process.env.COUCH_DATABASE)
  }

  async create(data: CulturaDto): Promise<CulturaEntity> {
    const cultura: CulturaEntity = new CulturaEntity(data);
    const resp: nano.DocumentInsertResponse = await this.repository.insert(cultura);
    if (!resp.ok) {
      throw new ConflictException("Erro ao criar cultura")
    }
    cultura.processAPIresponse(resp);

    return cultura;
  }

  async findAll() : Promise<CulturaEntity[]> {
    try {
      const resp = await this.repository.list({include_docs : true})
      return resp.rows.map(row => row.doc)
    } catch (error) {
      throw new Error(error)
    }
  }

  async findOne(id: string): Promise<CulturaEntity> {
    return this.repository.get(id);
  }

  async remove(id: string, rev: string): Promise<nano.DocumentDestroyResponse> {
    return this.repository.destroy(id, rev);
  }

  async update(id: string, rev: string, data: CulturaDto): Promise<nano.DocumentInsertResponse> {
    const cultura: CulturaEntity = new CulturaEntity(data);
    return this.repository.insert(cultura, { docName: id, rev: rev });
  }
}
