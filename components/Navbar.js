'use client';
import React, { useState } from "react";
import {
  Navbar,
  NavbarBrand,
  NavbarContent,
  NavbarItem,
  NavbarMenuToggle,
  NavbarMenu,
  NavbarMenuItem,
  Link,
  Button,
  Modal,
  ModalContent,
  
  ModalHeader,
  ModalBody,
  ModalFooter,
  Input,
} from "@heroui/react";
import { UserButton } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

export const AcmeLogo = () => {
  return (
    <svg fill="none" height="36" viewBox="0 0 32 32" width="36">
      <path
        clipRule="evenodd"
        d="M17.6482 10.1305L15.8785 7.02583L7.02979 22.5499H10.5278L17.6482 10.1305ZM19.8798 14.0457L18.11 17.1983L19.394 19.4511H16.8453L15.1056 22.5499H24.7272L19.8798 14.0457Z"
        fill="currentColor"
        fillRule="evenodd"
      />
    </svg>
  );
};

// Custom SVG Icons
const HomeIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-5 w-5"
    viewBox="0 0 20 20"
    fill="currentColor"
  >
    <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
  </svg>
);

const VideoIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-5 w-5"
    viewBox="0 0 20 20"
    fill="currentColor"
  >
    <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
  </svg>
);

const TrophyIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-5 w-5"
    viewBox="0 0 20 20"
    fill="currentColor"
  >
    <path
      fillRule="evenodd"
      d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
      clipRule="evenodd"
    />
  </svg>
);

const PlusIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-4 w-4"
    viewBox="0 0 20 20"
    fill="currentColor"
  >
    <path
      fillRule="evenodd"
      d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
      clipRule="evenodd"
    />
  </svg>
);

export default function NavbarSection() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [sessionTitle, setSessionTitle] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const menuItems = [
    { name: "Home", icon: <HomeIcon />, href: "/" },
    { name: "Videos", icon: <VideoIcon />, href: "/videos" },
    { name: "Leaderboard", icon: <TrophyIcon />, href: "/leaderboard" },
  ];

  const handleStartZoom = async () => {
    if (!sessionTitle.trim()) return;

    try {
      setIsLoading(true);
      const response = await fetch("/api/create-zoom-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: sessionTitle,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create Zoom session", response);
      }

      const data = await response.json();
      router.push(`/session/${data.session_id}?join=${data.join_url}`);
    } catch (error) {
      console.error("Error creating Zoom session:", error);
      alert("Failed to create Zoom session. Please try again.");
    } finally {
      setIsLoading(false);
      setIsModalOpen(false);
    }
  };
  return (
    <>
      {/* Navbar with Glassmorphism Effect */}
      <Navbar
        className="px-12 h-16 backdrop-blur-md bg-black border-b border-neutral-700"
        onMenuOpenChange={setIsMenuOpen}
      >
      <NavbarContent>
          <NavbarMenuToggle
            aria-label={isMenuOpen ? "Close menu" : "Open menu"}
            className="sm:hidden text-white"
          />
          <NavbarBrand>
            <AcmeLogo />
            <p className="font-bold text-white text-xl ml-2">GroupThink</p>
          </NavbarBrand>
        </NavbarContent>

        {/* Desktop Links */}
        <NavbarContent className="hidden sm:flex gap-6" justify="center">
          {menuItems.map((item, index) => (
            <NavbarItem key={index}>
              <Link
                href={item.href}
                className="flex items-center gap-2 text-neutral-300 hover:text-white transition-colors"
              >
                {item.icon}
                <span>{item.name}</span>
              </Link>
            </NavbarItem>
          ))}
        </NavbarContent>

        {/* Start Zoom Button and User Button */}
        <NavbarContent justify="end">
          <NavbarItem>
            <Button
              className="py-1 px-4 text-sm flex bg-blue-600 text-white rounded-3xl"
              color="foreground"
              onPress={()=> router.push("/create-session")}            >
              <PlusIcon className="h-4 w-4" />
              <span className="text-sm">Start Zoom</span>
            </Button>
          </NavbarItem>
          <NavbarItem className="p-0 m-0">
            <UserButton appearance={{
              elements: {
                avatarBox: {
                  width: "36px",
                  height: "36px",
                },
              },
            }} />
          </NavbarItem>
        </NavbarContent>

        {/* Mobile Menu */}
        <NavbarMenu className="backdrop-blur-md bg-neutral-900/50">
          {menuItems.map((item, index) => (
            <NavbarMenuItem key={index}>
              <Link
                href={item.href}
                className="w-full flex items-center gap-2 text-neutral-300 hover:text-white transition-colors"
              >
                {item.icon}
                <span>{item.name}</span>
              </Link>
            </NavbarMenuItem>
          ))}
        </NavbarMenu>
      </Navbar>

    </>
  );
}