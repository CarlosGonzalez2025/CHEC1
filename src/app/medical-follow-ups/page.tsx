'use client';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, PlusCircle } from 'lucide-react';
import { MedicalFollowUp } from '@/lib/data';
import AppLayout from '@/components/layout/app-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';

function getStatusBadge(status: MedicalFollowUp['status']) {
  switch (status) {
    case 'Scheduled':
      return <Badge variant="secondary">Scheduled</Badge>;
    case 'Completed':
      return <Badge className="bg-green-500">Completed</Badge>;
    case 'Canceled':
      return <Badge variant="destructive">Canceled</Badge>;
  }
}

export default function MedicalFollowUpsPage() {
    const { employees, medicalFollowUps } = useAuth();

    function getEmployeeName(employeeId: string) {
        return employees.find((e) => e.id === employeeId)?.fullName || 'Unknown';
    }
  return (
    <AppLayout pageTitle="Medical Follow-ups">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Appointment Schedule</CardTitle>
            <CardDescription>
              Manage all employee medical follow-up appointments.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Select defaultValue="all">
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">View for All</SelectItem>
                <SelectItem value="hr">HR View</SelectItem>
                <SelectItem value="medical">Medical View</SelectItem>
                <SelectItem value="management">Management View</SelectItem>
              </SelectContent>
            </Select>
            <Dialog>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1">
                  <PlusCircle className="h-4 w-4" />
                  Schedule Follow-up
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>New Medical Follow-up</DialogTitle>
                  <DialogDescription>
                    Fill in the details for the new appointment.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="employee" className="text-right">
                      Employee
                    </Label>
                    <Select>
                      <SelectTrigger className="col-span-3">
                          <SelectValue placeholder="Select an employee" />
                      </SelectTrigger>
                      <SelectContent>
                          {employees.map(emp => (
                              <SelectItem key={emp.id} value={emp.id}>{emp.fullName}</SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="datetime" className="text-right">
                      Date & Time
                    </Label>
                    <Input id="datetime" type="datetime-local" className="col-span-3" />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="doctor" className="text-right">
                      Doctor
                    </Label>
                    <Input id="doctor" className="col-span-3" defaultValue="Dr. Smith" />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit">Schedule</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Date & Time</TableHead>
                <TableHead>Doctor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {medicalFollowUps.map((followUp) => (
                <TableRow key={followUp.id}>
                  <TableCell className="font-medium">
                    {getEmployeeName(followUp.employeeId)}
                  </TableCell>
                  <TableCell>
                    {followUp.dateTime.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                  </TableCell>
                  <TableCell>{followUp.doctor}</TableCell>
                  <TableCell>{getStatusBadge(followUp.status)}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button aria-haspopup="true" size="icon" variant="ghost">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Toggle menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>Edit</DropdownMenuItem>
                        <DropdownMenuItem>Mark as Completed</DropdownMenuItem>
                        <DropdownMenuItem>Cancel</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AppLayout>
  );
}
