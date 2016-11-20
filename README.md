# EDMS (Employee Data Management System)

This project was written by gewtonj@br.ibm.com as part of the Case Study 1 for the
[Application Developer-Cloud.Java Advanced Level learning path](https://lpb.w3bmix.ibm.com/?id=85257E85001C3E31).

Technologies: Node.js, MongoDB, Express. Please refer to https://lpb.w3bmix.ibm.com/?id=85257E85001C3E31
for more info on the requirements.

## Usage

The application, currently hosted at https://gewtonj-edms.mybluemix.net/, is 
composed by a web interface which can be accessible via browser, and a REST
API to be used by other applications or clients.

The REST resources are:

| Verb          | Resource                  | Required Parameters           |
| ------------- | ------------------------- | ----------------------------- |
| POST          | /api/authenticate         | See [here](#api-authenticate) |
| GET           | /api/employee/:username   | See [here](#employee-get)     |
| PUT           | /api/employee/:username   | See [here](#employee-put)     |
| POST          | /api/employee/:username   | See [here](#employee-post)    |
| DELETE        | /api/employee/:username   | See [here](#employee-delete)  |

***

### POST /api/authenticate

Issues an API token to be used in further API calls. This should be called first 
before trying out the other methods, since they require an API token for authentication.

#### Authorization headers

- username: a valid employee username
- password: the employee's password

#### Parameter body

None

#### Return JSON

- success: true if operation was successfully completed
- jwt: [API token](https://jwt.io/) to be used in further API calls

***

### GET /api/employee/:username

GETs an employee record.

#### Authorization headers

- username: a valid API token issued for an specific username (see [here](#api-authenticate))

#### Parameter body

None

#### Return JSON

- _id: employee id
- username: employee username
- firstname: employee first name
- lastname: employee last name
- email: employee email
- password: employee hashed password

***

### PUT /api/employee/:username

PUTs an employee record. A new record will be created if not exists.

#### Authorization headers

Not required.

#### Parameter body

- employee[username]: the user name (must be unique and only contain alphanumeric characters)
- employee[firstname]: the first name
- employee[lastname]: the last name
- employee[email]: the email (must be unique)
- employee[password]: the password

all parameters are required

#### Return JSON

- _id: employee id
- username: employee username
- firstname: employee first name
- lastname: employee last name
- email: employee email
- password: employee hashed password

***

### POST /api/employee/:username

POSTs data to change an existing employee record. The resource (username) must exist previously.

#### Authorization headers

- username: a valid API token issued for an specific username (see [here](#api-authenticate))

#### Parameter body

- employee[firstname]: the new first name
- employee[lastname]: the new last name
- employee[email]: the new email (must be unique)
- employee[password]: the new password
- oldpassword: the old password. Used to match the current records, will not be 
persisted. Only required if employee[password] is present

No field is required. Only sent fields will be updated.

#### Return JSON

- _id: employee id
- username: employee username
- firstname: employee first name
- lastname: employee last name
- email: employee email
- password: employee hashed password

***

### DELETE /api/employee/:username

DELETEs an employee.

#### Authorization headers

- username: a valid API token issued for an specific username (see [here](#api-authenticate))

#### Parameter body

None

#### Return JSON

- success: true if operation was successfully completed