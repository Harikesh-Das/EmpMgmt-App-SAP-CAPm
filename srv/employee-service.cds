using {empmgmt as db} from '../db/schema';

service EmployeeService {

    @restrict: [
        {
            grant: 'READ',
            to   : 'AuthenticatedUser'
        },
        {
            grant: [
                'CREATE',
                'UPDATE',
                'DELETE'
            ],
            to   : 'HR'
        }
    ]
    entity Employee as projection on db.Employee;

}
