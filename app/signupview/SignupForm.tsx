"use client";

import { useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { Button } from "../components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../components/ui/form";
import { Input } from "../components/ui/input";
import { submitSignup, type SignupResult } from "./actions";
import { signupSchema, type SignupValues } from "./schema";

export default function SignupForm() {
  const [result, setResult] = useState<SignupResult | null>(null);
  const [isPending, startTransition] = useTransition();
  const form = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
    mode: "onTouched",
  });

  const handleSubmit = (values: SignupValues) => {
    setResult(null);
    startTransition(async () => {
      const response = await submitSignup(values);
      setResult(response);
      if (response.success) {
        form.reset();
      }
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-5">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
                <FormLabel className="text-lg font-semibold text-orange-500">
                    Full name
                </FormLabel>
                <FormControl>
                    <Input
                        placeholder="Jane Doe"
                        {...field}
                        className={`text-lg text-black placeholder:text-gray-400 ${
                            form.formState.errors.name
                                ? "border-red-500/40 ring-2 ring-red-500/30"
                                : ""
                        }`}
                    />
                </FormControl>

                <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
                <FormLabel className="text-lg font-semibold text-orange-500">
                    Email address
                </FormLabel>
                <FormControl>
                    <Input
                        placeholder="you@example.com"
                        type="email"
                        {...field}
                        className={`text-lg text-black placeholder:text-gray-400 ${
                            form.formState.errors.email
                                ? "border-red-500/40 ring-2 ring-red-500/30"
                                : ""
                        }`}
                    />
                </FormControl>

                <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
                <FormLabel className="text-lg font-semibold text-orange-500">
                    Password
                </FormLabel>
                <FormControl>
                    <Input
                        placeholder="Create a password"
                        type="password"
                        {...field}
                        className={`text-lg text-black placeholder:text-gray-400 ${
                            form.formState.errors.password
                                ? "border-red-500/40 ring-2 ring-red-500/30"
                                : ""
                        }`}
                    />
                </FormControl>

                <FormDescription>
                Use at least 8 characters with letters and numbers.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={isPending} className="w-full">
          {isPending ? "Creating your account..." : "Create your account"}
        </Button>
        {result ? (
          <div
            className={`rounded-md border px-4 py-3 text-sm font-medium ${
              result.success
                ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                : "border-rose-300 bg-rose-50 text-rose-700"
            }`}
          >
            {result.message}
          </div>
        ) : null}
      </form>
    </Form>
  );
}
