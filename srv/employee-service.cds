using {empmgmt as db} from '../db/schema';

service EmployeeService {

    // Role Based Access

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

    //Projections

    entity Employee as projection on db.Employee;

    // Actions
    action uploadProfileImage(ID: UUID,
                            image: LargeBinary,
                            fileName: String,
                            mimeType: String);

}
