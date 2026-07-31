using {empmgmt as db} from '../db/schema';

service LeaveService {

    // Projections

    entity Leave as projection on db.Leave;

    entity LeaveBalance as projection on db.LeaveBalance;

    entity Holiday as projection on db.Holiday;

    // Leave Actions

    action approveLeave(ID:UUID);

    action rejectLeave(ID:UUID, reason: String);

    action cancelLeave(ID:UUID);

} 