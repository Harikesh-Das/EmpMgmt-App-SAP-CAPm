using {empmgmt as db} from '../db/schema';

service LeaveService {

    entity Leave as projection on db.Leave;

    entity LeaveBalance as projection on db.LeaveBalance;

    entity Holiday as projection on db.Holiday;

} 