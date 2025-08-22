"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

type Todo = {
  id: number;
  title: string;
  description: string | null;
  due_date: string | null;
  completed: boolean;
};

export default function TodoList() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);

  useEffect(() => {
    fetchTodos();
  }, []);

  const fetchTodos = async () => {
    const { data, error } = await supabase
      .from("todos")
      .select("*")
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
    setEditingId(null);
  };

  const saveTodo = async () => {
    if (!title.trim()) {
      alert("Title is required");
      return;
    }

    if (editingId) {
      // Update
      const { data, error } = await supabase
        .from("todos")
        .update({ title, description, due_date: dueDate })
        .eq("id", editingId)
        .select();
      if (error) {
        console.error("Update error:", error);
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
      const { data } = await supabase
        .from("todos")
        .insert([{ title, description, due_date: dueDate }])
        .select();

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
      .select();
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

      {/* List */}
      <div className="space-y-3">
        {todos.map((todo) => (
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
            </CardContent>
          </Card>
        ))}
        {todos.length === 0 && (
          <p className="text-center text-sm text-gray-500">
            No todos yet. Add one above!
          </p>
        )}
      </div>
    </div>
  );
}
