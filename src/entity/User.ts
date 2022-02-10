import {Entity, PrimaryColumn, Column} from "typeorm";

@Entity()
export class User {

    @PrimaryColumn({ unique: true })
    tg_id: string;

    @Column()
    firstName: string;

    @Column()
    phone_number: string;

}
