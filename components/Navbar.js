// components/Navbar.jsx
'use client'
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

export default function NavbarSection() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [sessionTitle, setSessionTitle] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const menuItems = ["Home", "Videos", "Activity", "Leaderboard"];

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
      
      // Redirect to the session page with the session ID
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
      <Navbar className="bg-black h-16" onMenuOpenChange={setIsMenuOpen}>
        <NavbarContent>
          <NavbarMenuToggle
            aria-label={isMenuOpen ? "Close menu" : "Open menu"}
            className="sm:hidden "
          />
          <NavbarBrand>
            <AcmeLogo />
            <p className="font-bold text-inherit">GroupThink</p>
          </NavbarBrand>
        </NavbarContent>

        <NavbarContent className="hidden sm:flex gap-4" justify="center">
          <NavbarItem>
            <Link color="foreground" href="/">
              Home
            </Link>
          </NavbarItem>
          <NavbarItem isActive>
            <Link aria-current="page" href="/videos">
              Videos
            </Link>
          </NavbarItem>
          <NavbarItem>
            <Link color="foreground" href="/leaderboard">
              Leaderboard
            </Link>
          </NavbarItem>
        </NavbarContent>
        
        <NavbarContent justify="end">
          <NavbarItem>
            <Button
              className="py-2 px-4 text-sm bg-gray-600 text-white rounded-3xl"
              color="foreground"
              onClick={() => setIsModalOpen(true)}
            >
              + Start Zoom
            </Button>
          </NavbarItem>
          <NavbarItem className="hidden lg:flex">
            <UserButton />
          </NavbarItem>
        </NavbarContent>
        
        <NavbarMenu>
          {menuItems.map((item, index) => (
            <NavbarMenuItem key={`${item}-${index}`}>
              <Link
                className="w-full"
                color={
                  index === 2
                    ? "primary"
                    : index === menuItems.length - 1
                    ? "danger"
                    : "foreground"
                }
                href="#"
                size="lg"
              >
                {item}
              </Link>
            </NavbarMenuItem>
          ))}
        </NavbarMenu>
      </Navbar>

      <Modal className="w-full min-h-screen items-center justify-center backdrop-blur-lg bg-gray-800 p-4 space-y-24  " isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <ModalContent>
          <ModalHeader>Start a New Session</ModalHeader>
          <ModalBody>
            <Input
              placeholder="Enter a title for your session"
              value={sessionTitle}
              onChange={(e) => setSessionTitle(e.target.value)}
              fullWidth
            />
          </ModalBody>
          <ModalFooter>
            <Button
              color="primary"
              onClick={handleStartZoom}
              disabled={isLoading || !sessionTitle.trim()}
            >
              {isLoading ? "Creating..." : "Start Session"}
            </Button>
            <Button color="neutral" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}
