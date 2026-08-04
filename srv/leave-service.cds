using {empmgmt as db} from '../db/schema';

type Dashboard : {
    totalEmployees    : Integer;
    activeEmployees   : Integer;
    inactiveEmployees : Integer;
    pendingLeaves     : Integer;
    approvedLeaves    : Integer;
    rejectedLeaves    : Integer;
    cancelledLeaves   : Integer;
    upcomingHolidays  : Integer;
    teamSize          : Integer;
    pendingApprovals  : Integer;
    myPendingLeaves   : Integer;
    myApprovedLeaves  : Integer;
    myRejectedLeaves  : Integer;
    myCancelledLeaves : Integer;
    myCasualBalance   : Integer;
    mySickBalance     : Integer;
};


service LeaveService {

    // Projections

    entity Leave        as projection on db.Leave;

    entity LeaveBalance as projection on db.LeaveBalance;

    entity Holiday      as projection on db.Holiday;

    // Leave Actions

    action approveLeave(ID: UUID);

    action rejectLeave(ID: UUID, reason: String);

    action cancelLeave(ID: UUID);

    // Dashboard Actions

    action getDashboard() returns Dashboard;

}
