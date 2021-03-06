import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { check } from 'meteor/check';

export const Tasks = new Mongo.Collection('tasks');

if (Meteor.isServer) {
    // Este código é executado apenas no servidor
    // Publica apenas tarefas que são públicas ou pertencem ao usuário atual
    Meteor.publish('tasks', function tasksPublication() {
        return Tasks.find({
            $or: [
                {private: {$ne: true}},
                {owner: this.userId},
            ],
        });
    });
}

Meteor.methods({
    'tasks.insert'(text, description) {
        check(text, String);
        check(description, String);

        // Verifique se o usuário está conectado antes de inserir uma tarefak
        if (! this.userId) {
            throw new Meteor.Error('not-authorized');
        }

        Tasks.insert({
            text,
            description,
            createdAt: new Date(),
            owner: this.userId,
            username: Meteor.users.findOne(this.userId).username,
        });
    },
    'tasks.setUpdate'(update){
        check(update, Object);
        check(update._id, String);
        check(update.$set, Object);

        const task = Tasks.findOne({_id: update._id});
        if(task){
            if (task.private && task.owner !== this.userId) {
                // Se a tarefa for privada, verifique se apenas o proprietário pode altera-la
                throw new Meteor.Error('not-authorized');
            }
            Tasks.update({_id: update._id}, { $set:  update.$set});
        }
    },
    'tasks.remove'(taskId) {
        check(taskId, String);

        const task = Tasks.findOne(taskId);
        if (task.private && task.owner !== this.userId) {
            // Se a tarefa for privada, verifique se apenas o proprietário pode excluí-la
            throw new Meteor.Error('not-authorized');
        }

        Tasks.remove(taskId);
    },
    'tasks.delete-all-checked'(){
        let tarefasConcluidas = Tasks.find({ checked: true}, {fields: {_id: 1}}).fetch();
        if (tarefasConcluidas.length) {
            tarefasConcluidas.forEach(task => Meteor.call('tasks.remove', task._id));
        }

    },
    'tasks.setChecked'(taskId, setChecked) {
        check(taskId, String);
        check(setChecked, Boolean);

        const task = Tasks.findOne(taskId);
        if (task.private && task.owner !== this.userId) {
            // Se a tarefa for privada, verifique se apenas o proprietário pode excluí-la
            throw new Meteor.Error('not-authorized');
        }

        Tasks.update(taskId, { $set: { checked: setChecked } });
    },
    'tasks.setPrivate'(taskId, setToPrivate){
        check(taskId, String);
        check(setToPrivate, Boolean);

        const task = Tasks.findOne(taskId);

        // Verifique se apenas o proprietário da tarefa pode tornar uma tarefa privada
        if (task.owner !== this.userId) {
            throw new Meteor.Error('not-authorized');
        }
        Tasks.update(taskId, {$set: {private: setToPrivate}});
    }
});
