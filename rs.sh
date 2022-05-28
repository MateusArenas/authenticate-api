# mongo mongodb://localhost --eval "rs.initiate( { _id : 'rs0', members: [{ _id: 0, host: 'localhost:27017' }]})"
# mongo mongodb://localhost --eval "rs.add( 'localhost:27017' )"
# mongo mongodb://localhost --eval "db.isMaster().primary"
# mongo mongodb://localhost --eval "rs.slaveOk()"

mongo --host localhost --port 27017 --eval 'rs.initiate({_id: "testing", members: [{_id: 0, host: "localhost:27017" }]})'
