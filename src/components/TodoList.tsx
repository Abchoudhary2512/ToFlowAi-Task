"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Profile = {
  id: string;
  name: string;
};

type Todo = {
  id: number;
  title: string;
  description: string | null;
  due_date: string | null;
  completed: boolean;
  assignee_id: string;
  assignee?: Profile; // joined
};

export default function TodoList() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [filterUserId, setFilterUserId] = useState<string>("");
  useEffect(() => {
    fetchTodos(); // it will fetch all the todos from the supbase db(todos tables)
    fetchUsers(); // all the users from the profile table
  }, []);

  const fetchUsers = async () => {
    const { data, error } = await supabase.from("profiles").select("id, name");
    if (error) {
      console.error("User fetch error:", error);
      return;
    }
    setUsers(data || []);
  };

  const fetchTodos = async () => {
    const { data, error } = await supabase
      .from("todos")
      .select("*, assignee:profiles(id, name)")
      .order("id", { ascending: false });
    if (error) {
      console.error("Fetch error:", error);
      return;
    }
    setTodos(data as Todo[]);
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setDueDate("");
    setAssigneeId("");
    setEditingId(null);
  };

  const saveTodo = async () => {
    if (!title.trim()) {
      alert("Title is required");
      return;
    }

    if (!assigneeId) {
      alert("Assignee is required");
      return;
    }

    if (editingId) {
      // Update
      const { data, error } = await supabase
        .from("todos")
        .update({
          title,
          description,
          due_date: dueDate,
          assignee_id: assigneeId,
        })
        .eq("id", editingId)
        .select("*, assignee:profiles(id, name)");
      if (error) {
        console.error("Update error:", error);
        alert(error.message);
        return;
      }
      if (data) {
        setTodos((prev) =>
          prev.map((t) => (t.id === editingId ? (data[0] as Todo) : t))
        );
      }
      resetForm();
    } else {
      // Create
      const { data, error } = await supabase
        .from("todos")
        .insert([
          {
            title,
            description,
            due_date: dueDate,
            assignee_id: assigneeId,
          },
        ])
        .select("*, assignee:profiles(id, name)");

      if (error) {
        console.error("Insert error:", error);
        alert(error.message);
        return;
      }

      if (data) {
        setTodos((prev) => [data[0] as Todo, ...prev]);
      }
      resetForm();
    }
  };

  const toggleTodo = async (id: number, completed: boolean) => {
    const { data, error } = await supabase
      .from("todos")
      .update({ completed: !completed })
      .eq("id", id)
      .select("*, assignee:profiles(id, name)");
    if (error) {
      console.error("Toggle error:", error);
      return;
    }
    if (data) {
      setTodos((prev) =>
        prev.map((t) => (t.id === id ? (data[0] as Todo) : t))
      );
    }
  };

  const editTodo = (todo: Todo) => {
    setTitle(todo.title);
    setDescription(todo.description || "");
    setDueDate(todo.due_date || "");
    setAssigneeId(todo.assignee_id || "");
    setEditingId(todo.id);
  };

  const deleteTodo = async (id: number) => {
    const { error } = await supabase.from("todos").delete().eq("id", id);
    if (error) {
      console.error("Delete error:", error);
      return;
    }
    setTodos((prev) => prev.filter((t) => t.id !== id));
  };

  const assignedIds = todos
    .filter((t) => !editingId || t.id !== editingId)
    .map((t) => t.assignee_id);

  const availableUsers = users.filter(
    (u) => !assignedIds.includes(u.id) || u.id === assigneeId
  );

  const filteredTodos = filterUserId
    ? todos.filter((t) => t.assignee_id === filterUserId)
    : todos;

  return (
    <div className="max-w-xl mx-auto space-y-6 mt-8">
      {/* Form */}
      <Card className="p-4 space-y-3">
        <h2 className="text-lg font-semibold">
          {editingId ? "✏️ Edit Todo" : "➕ Add Todo"}
        </h2>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title"
        />
        <Input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description"
        />
        <Input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
        />

        {/* Assignee Dropdown */}
        <Select
          value={assigneeId || undefined}
          onValueChange={(val) => setAssigneeId(val)}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select Assignee" />
          </SelectTrigger>
          <SelectContent>
            {availableUsers.map((user) => (
              <SelectItem key={user.id} value={user.id}>
                {user.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex gap-2">
          <Button type="button" onClick={saveTodo}>
            {editingId ? "Update" : "Add"}
          </Button>
          {editingId && (
            <Button type="button" variant="ghost" onClick={resetForm}>
              Cancel
            </Button>
          )}
        </div>
      </Card>

      {/* Filter Dropdown */}
      <div className="flex items-center gap-2">
        <label className="text-sm text-gray-600">Filter by Assignee:</label>
        <Select
          value={filterUserId || undefined}
          onValueChange={(val) => setFilterUserId(val)}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All Assignees" />
          </SelectTrigger>
          <SelectContent>
            {users.map((user) => (
              <SelectItem key={user.id} value={user.id}>
                {user.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      <div className="space-y-3">
        {filteredTodos.map((todo) => (
          <Card key={todo.id} className="p-3">
            <CardContent className="p-0 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={todo.completed}
                    onChange={() => toggleTodo(todo.id, todo.completed)}
                  />
                  <span
                    className={
                      todo.completed ? "line-through text-gray-500" : ""
                    }
                  >
                    {todo.title}
                  </span>
                </label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => editTodo(todo)}
                  >
                    Edit
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    onClick={() => deleteTodo(todo.id)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
              {todo.description && (
                <p className="text-sm text-gray-600">{todo.description}</p>
              )}
              {todo.due_date && (
                <p className="text-xs text-gray-500">
                  📅 Due: {new Date(todo.due_date).toLocaleDateString()}
                </p>
              )}
              {todo.assignee && (
                <p className="text-xs text-gray-500">
                  🙎‍♂️ Assigned to: {todo.assignee.name}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
        {filteredTodos.length === 0 && (
          <p className="text-center text-sm text-gray-500">
            No todos found for this filter.
          </p>
        )}
      </div>
    </div>
  );
}
