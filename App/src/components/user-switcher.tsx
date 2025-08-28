"use client"

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Check, ChevronsUpDown, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { toast } from 'sonner'

interface User {
  id: string
  name: string
  email: string
  avatar?: string
  isActive?: boolean
}

interface UserSwitcherProps {
  users?: User[]
  selectedUserId?: string
  onUserSelect?: (userId: string) => void
  onAddUser?: () => void
}

export function UserSwitcher({ 
  users = [], 
  selectedUserId, 
  onUserSelect,
  onAddUser 
}: UserSwitcherProps) {
  const [selectedUser, setSelectedUser] = useState<User | undefined>(
    users.find(user => user.id === selectedUserId)
  )

  useEffect(() => {
    setSelectedUser(users.find(user => user.id === selectedUserId))
  }, [users, selectedUserId])

  const handleUserSelect = (user: User) => {
    setSelectedUser(user)
    onUserSelect?.(user.id)
    toast.success(`Switched to ${user.name}`)
  }

  const handleAddUser = () => {
    onAddUser?.()
  }

  if (users.length === 0) {
    return (
      <Button variant="outline" onClick={handleAddUser}>
        <Plus className="h-4 w-4 mr-2" />
        Add User
      </Button>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="w-full justify-between"
        >
          <div className="flex items-center gap-2">
            <Avatar className="h-5 w-5">
              <AvatarImage src={selectedUser?.avatar} alt={selectedUser?.name} />
              <AvatarFallback>
                {selectedUser?.name?.charAt(0).toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <span className="truncate">{selectedUser?.name || 'Select user...'}</span>
            {selectedUser?.isActive && (
              <Badge variant="secondary" className="text-xs">Active</Badge>
            )}
          </div>
          <ChevronsUpDown className="ml-auto h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-[300px]">
        <div className="p-2">
          <div className="text-sm font-medium">Users</div>
        </div>
        <DropdownMenuSeparator />
        {users.map((user) => (
          <DropdownMenuItem
            key={user.id}
            onClick={() => handleUserSelect(user)}
            className="flex items-center gap-2 p-3"
          >
            <Avatar className="h-6 w-6">
              <AvatarImage src={user.avatar} alt={user.name} />
              <AvatarFallback>
                {user.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate">{user.name}</span>
                {user.isActive && (
                  <Badge variant="secondary" className="text-xs">Active</Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            </div>
            <Check
              className={cn(
                "ml-auto h-4 w-4",
                selectedUser?.id === user.id ? "opacity-100" : "opacity-0"
              )}
            />
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleAddUser}>
          <Plus className="mr-2 h-4 w-4" />
          Add new user
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}


