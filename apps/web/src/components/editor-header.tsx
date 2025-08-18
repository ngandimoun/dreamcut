"use client";

import { Button } from "./ui/button";
import { ChevronDown, ArrowLeft, SquarePen, Trash, Sun } from "lucide-react";
import { HeaderBase } from "./header-base";
import { useProjectStore } from "@/stores/project-store";
import { KeyboardShortcutsHelp } from "./keyboard-shortcuts-help";
import { useState } from "react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import Link from "next/link";
import { RenameProjectDialog } from "./rename-project-dialog";
import { DeleteProjectDialog } from "./delete-project-dialog";
import { ExportDialog } from "./export-dialog";
import { useRouter } from "next/navigation";
import { FaDiscord } from "react-icons/fa6";
import { useTheme } from "next-themes";
import { TransitionUpIcon } from "./icons";
import { PanelPresetSelector } from "./panel-preset-selector";


export function EditorHeader() {
  const { activeProject, renameProject, deleteProject } = useProjectStore();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const router = useRouter();
  const { theme, setTheme } = useTheme();

  const handleNameSave = async (newName: string) => {
    console.log("handleNameSave", newName);
    if (activeProject && newName.trim() && newName !== activeProject.name) {
      try {
        await renameProject(activeProject.id, newName.trim());
        setIsRenameDialogOpen(false);
      } catch (error) {
        console.error("Failed to rename project:", error);
      }
    }
  };

  const handleDelete = () => {
    if (activeProject) {
      deleteProject(activeProject.id);
      setIsDeleteDialogOpen(false);
      router.push("/projects");
    }
  };

  const leftContent = (
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="secondary"
            className="h-auto py-1.5 px-2.5 flex items-center justify-center"
          >
            <ChevronDown className="text-muted-foreground" />
            <span className="text-[0.85rem] mr-2">{activeProject?.name}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-40 z-100">
          <Link href="/projects">
            <DropdownMenuItem className="flex items-center gap-1.5">
              <ArrowLeft className="h-4 w-4" />
              Projects
            </DropdownMenuItem>
          </Link>
          <DropdownMenuItem
            className="flex items-center gap-1.5"
            onClick={() => setIsRenameDialogOpen(true)}
          >
            <SquarePen className="h-4 w-4" />
            Rename project
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            className="flex items-center gap-1.5"
            onClick={() => setIsDeleteDialogOpen(true)}
          >
            <Trash className="h-4 w-4" />
            Delete Project
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link
              href="https://discord.gg/zmR9N35cjK"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5"
            >
              <FaDiscord className="h-4 w-4" />
              Discord
            </Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <RenameProjectDialog
        isOpen={isRenameDialogOpen}
        onOpenChange={setIsRenameDialogOpen}
        onConfirm={handleNameSave}
        projectName={activeProject?.name || ""}
      />
      <DeleteProjectDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleDelete}
        projectName={activeProject?.name || ""}
      />
    </div>
  );

  const rightContent = (
    <nav className="flex items-center gap-2">
      <PanelPresetSelector />
      <KeyboardShortcutsHelp />
      <ExportButton />
      <Button
        size="icon"
        variant="text"
        className="h-7"
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      >
        <Sun className="!size-[1.1rem]" />
        <span className="sr-only">{theme === "dark" ? "Light" : "Dark"}</span>
      </Button>
    </nav>
  );

  return (
    <HeaderBase
      leftContent={leftContent}
      rightContent={rightContent}
      className="bg-background h-[3.2rem] px-3 items-center mt-0.5"
    />
  );
}

function ExportButton() {
  return (
    <ExportDialog />
  );
}
