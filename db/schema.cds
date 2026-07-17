    namespace empmgmt;
    using { managed } from '@sap/cds/common';

    type EmployeeRole: String enum{
        employee;
        manager;
        hr;
    } 
    type EmployeeStatus: String enum{
        active;
        inactive;
    }
    type LeaveType: String enum{
        sick;
        casual;
    }
    type LeaveStatus: String enum{
        pending;
        approved;
        rejected;
        cancelled;
    }



    entity Employee: managed {
        key ID: UUID;
        @assert.unique
        empId: String(10) not null ;
        name: String(100) not null;
        @assert.unique
        email: String(255) not null;
        passwordHash: LargeString not null;
        department: String(50) not null ;
        role: EmployeeRole not null default 'employee';
        status: EmployeeStatus not null default 'active' ;
        manager: Association to Employee;
    }

    entity Leave : managed {
        key ID: UUID;
        employee: Association to Employee not null;
        approver: Association to Employee;
        leaveType:LeaveType not null ;
        startDate: Date not null;
        endDate: Date not null;
        reason: LargeString not null;
        status: LeaveStatus not null default 'pending';
        appliedOn: Timestamp not null default $now;
        approvedOn: Timestamp;
    }

    entity LeaveBalance : managed {
        key ID: UUID;
        employee: Association to Employee not null;
        sickBalanceRemaining: Integer not null default 8;
        casualBalanceRemaining:Integer not null  default 16;
        
    }

    entity Holiday: managed{
        key ID: UUID;
        holidayName: String(100) not null;
        holidayDate: Date not null;
    }

