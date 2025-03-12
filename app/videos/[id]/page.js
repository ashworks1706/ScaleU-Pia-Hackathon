'use client'
import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import NavbarSection from "../../../components/Navbar";

export default function VideoView() {
  const params = useParams();
  const { id } = params; // id from the URL
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    async function fetchSession() {
      try {
        const res = await fetch(`/python/sessions/${id}`);
        if (!res.ok) {
          const errText = await res.text();
          throw new Error(errText || "Failed to fetch session data");
        }
        const data = await res.json();
        setSession(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchSession();
  }, [id]);

  if (loading) return <div className="p-4">Loading...</div>;
  if (error) return <div className="p-4">Error: {error}</div>;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
      <NavbarSection />
      <div className="container mx-auto py-8">
        <h1 className="text-3xl font-bold mb-4">{session.title}</h1>
        {session.status === "completed" && session.link ? (
          <video controls className="w-full rounded-md">
            <source src={session.link} type="video/webm" />
            Your browser does not support the video tag.
          </video>
        ) : (
          <p>This session is not available for viewing yet.</p>
        )}
      </div>
    </div>
  );
}
