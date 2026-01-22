import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { MainLayout } from '../../components/layout';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import refurbishmentService from '../../services/refurbishment.service';
import { toast } from 'react-toastify';
import {
  BuildingOfficeIcon,
  CheckCircleIcon,
  ClockIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';

const RefurbishmentDashboard = () => {
  const { user } = useSelector((state) => state.auth);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(false);
  const [dashboardData, setDashboardData] = useState(null);
  const [eligibleCenters, setEligibleCenters] = useState([]);
  const [allCenters, setAllCenters] = useState([]);
  const [recentlyRefurbished, setRecentlyRefurbished] = useState([]);
  const [pagination, setPagination] = useState({
    eligible: { limit: 10, offset: 0, total: 0 },
    all: { limit: 10, offset: 0, total: 0 },
    recent: { limit: 10, offset: 0, total: 0 },
  });

  // Check if user is admin
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';

  useEffect(() => {
    if (isAdmin) {
      loadDashboardData();
    }
  }, [isAdmin]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const response = await refurbishmentService.getDashboardSummary();
      if (response.success) {
        setDashboardData(response.data);
        // Load initial data for each tab
        await Promise.all([
          loadEligibleCenters(),
          loadAllCenters(),
          loadRecentlyRefurbished(),
        ]);
      }
    } catch (error) {
      toast.error('Failed to load dashboard data');
      console.error('Dashboard error:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadEligibleCenters = async (limit = 10, offset = 0) => {
    try {
      const response = await refurbishmentService.getEligibleCenters({ limit, offset });
      if (response.success) {
        setEligibleCenters(response.data.centers);
        setPagination((prev) => ({
          ...prev,
          eligible: {
            limit: response.data.pagination.limit,
            offset: response.data.pagination.offset,
            total: response.data.totalCount,
          },
        }));
      }
    } catch (error) {
      toast.error('Failed to load eligible centers');
    }
  };

  const loadAllCenters = async (limit = 10, offset = 0) => {
    try {
      const response = await refurbishmentService.getAllCenters({ limit, offset });
      if (response.success) {
        setAllCenters(response.data.centers);
        setPagination((prev) => ({
          ...prev,
          all: {
            limit: response.data.pagination.limit,
            offset: response.data.pagination.offset,
            total: response.data.totalCount,
          },
        }));
      }
    } catch (error) {
      toast.error('Failed to load all centers');
    }
  };

  const loadRecentlyRefurbished = async (limit = 10, offset = 0, within = 12) => {
    try {
      const response = await refurbishmentService.getRecentlyRefurbished({ limit, offset, within });
      if (response.success) {
        setRecentlyRefurbished(response.data.centers);
        setPagination((prev) => ({
          ...prev,
          recent: {
            limit: response.data.pagination.limit,
            offset: response.data.pagination.offset,
            total: response.data.totalCount,
          },
        }));
      }
    } catch (error) {
      toast.error('Failed to load recently refurbished centers');
    }
  };

  const handlePreviousPage = (tab) => {
    const currentPagination = pagination[tab];
    if (currentPagination.offset > 0) {
      const newOffset = Math.max(0, currentPagination.offset - currentPagination.limit);
      if (tab === 'eligible') loadEligibleCenters(currentPagination.limit, newOffset);
      else if (tab === 'all') loadAllCenters(currentPagination.limit, newOffset);
      else if (tab === 'recent') loadRecentlyRefurbished(currentPagination.limit, newOffset);
    }
  };

  const handleNextPage = (tab) => {
    const currentPagination = pagination[tab];
    const newOffset = currentPagination.offset + currentPagination.limit;
    if (newOffset < currentPagination.total) {
      if (tab === 'eligible') loadEligibleCenters(currentPagination.limit, newOffset);
      else if (tab === 'all') loadAllCenters(currentPagination.limit, newOffset);
      else if (tab === 'recent') loadRecentlyRefurbished(currentPagination.limit, newOffset);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getEligibilityBadge = (isEligible) => {
    return isEligible ? (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
        <CheckCircleIcon className="w-4 h-4 mr-1" />
        Eligible
      </span>
    ) : (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
        Not Eligible
      </span>
    );
  };

  if (!isAdmin) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
            <p className="text-gray-600">Only administrators can access this page.</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Refurbishment Dashboard</h1>
            <p className="text-gray-600 mt-1">
              Manage center refurbishments and track eligibility
            </p>
          </div>
          <Button onClick={loadDashboardData} disabled={loading}>
            <ArrowPathIcon className={`w-5 h-5 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Summary Cards */}
        {dashboardData && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Eligible Centers
                </CardTitle>
                <BuildingOfficeIcon className="w-5 h-5 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-600">
                  {dashboardData.summary.totalEligible}
                </div>
                <p className="text-xs text-gray-600 mt-1">
                  Centers ready for refurbishment
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Recently Refurbished
                </CardTitle>
                <CheckCircleIcon className="w-5 h-5 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">
                  {dashboardData.summary.totalRecentlyRefurbished}
                </div>
                <p className="text-xs text-gray-600 mt-1">
                  In the last 12 months
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Total Centers
                </CardTitle>
                <ClockIcon className="w-5 h-5 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-purple-600">
                  {dashboardData.summary.totalRefurbished}
                </div>
                <p className="text-xs text-gray-600 mt-1">
                  All refurbished centers
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="eligible">Eligible Centers</TabsTrigger>
            <TabsTrigger value="all">All Centers</TabsTrigger>
            <TabsTrigger value="recent">Recently Refurbished</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Top 10 Eligible Centers</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Center Name</TableHead>
                      <TableHead>Partner</TableHead>
                      <TableHead>Region</TableHead>
                      <TableHead>Last Refurbished</TableHead>
                      <TableHead>Months Since</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dashboardData?.eligibleCenters?.slice(0, 10).map((center) => (
                      <TableRow key={center.id}>
                        <TableCell className="font-medium">{center.center_name}</TableCell>
                        <TableCell>{center.organization_name}</TableCell>
                        <TableCell>{center.region}</TableCell>
                        <TableCell>{formatDate(center.last_refurbishment_date)}</TableCell>
                        <TableCell>
                          <span className="font-semibold text-orange-600">
                            {center.months_since_last} months
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recently Refurbished (Last 12 Months)</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Center Name</TableHead>
                      <TableHead>Partner</TableHead>
                      <TableHead>Region</TableHead>
                      <TableHead>Refurbished On</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dashboardData?.recentlyRefurbished?.slice(0, 10).map((center) => (
                      <TableRow key={center.id}>
                        <TableCell className="font-medium">{center.center_name}</TableCell>
                        <TableCell>{center.organization_name}</TableCell>
                        <TableCell>{center.region}</TableCell>
                        <TableCell>{formatDate(center.last_refurbishment_date)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Eligible Centers Tab */}
          <TabsContent value="eligible" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Eligible Centers ({pagination.eligible.total})</CardTitle>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePreviousPage('eligible')}
                      disabled={pagination.eligible.offset === 0}
                    >
                      Previous
                    </Button>
                    <span className="text-sm text-gray-600">
                      {pagination.eligible.offset + 1} -{' '}
                      {Math.min(
                        pagination.eligible.offset + pagination.eligible.limit,
                        pagination.eligible.total
                      )}{' '}
                      of {pagination.eligible.total}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleNextPage('eligible')}
                      disabled={
                        pagination.eligible.offset + pagination.eligible.limit >=
                        pagination.eligible.total
                      }
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Center Name</TableHead>
                      <TableHead>Partner</TableHead>
                      <TableHead>Region</TableHead>
                      <TableHead>City</TableHead>
                      <TableHead>Last Refurbished</TableHead>
                      <TableHead>Frequency</TableHead>
                      <TableHead>Months Since</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {eligibleCenters.map((center) => (
                      <TableRow key={center.id}>
                        <TableCell className="font-medium">{center.center_name}</TableCell>
                        <TableCell>{center.organization_name}</TableCell>
                        <TableCell>{center.region}</TableCell>
                        <TableCell>{center.city}</TableCell>
                        <TableCell>{formatDate(center.last_refurbishment_date)}</TableCell>
                        <TableCell>{center.refurbishment_frequency_months} months</TableCell>
                        <TableCell>
                          <span className="font-semibold text-orange-600">
                            {center.months_since_last}
                          </span>
                        </TableCell>
                        <TableCell>{getEligibilityBadge(center.is_eligible)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* All Centers Tab */}
          <TabsContent value="all" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>All Centers ({pagination.all.total})</CardTitle>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePreviousPage('all')}
                      disabled={pagination.all.offset === 0}
                    >
                      Previous
                    </Button>
                    <span className="text-sm text-gray-600">
                      {pagination.all.offset + 1} -{' '}
                      {Math.min(
                        pagination.all.offset + pagination.all.limit,
                        pagination.all.total
                      )}{' '}
                      of {pagination.all.total}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleNextPage('all')}
                      disabled={
                        pagination.all.offset + pagination.all.limit >= pagination.all.total
                      }
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Center Name</TableHead>
                      <TableHead>Partner</TableHead>
                      <TableHead>Region</TableHead>
                      <TableHead>City</TableHead>
                      <TableHead>Last Refurbished</TableHead>
                      <TableHead>Frequency</TableHead>
                      <TableHead>Eligibility</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allCenters.map((center) => (
                      <TableRow key={center.id}>
                        <TableCell className="font-medium">{center.center_name}</TableCell>
                        <TableCell>{center.organization_name}</TableCell>
                        <TableCell>{center.region}</TableCell>
                        <TableCell>{center.city}</TableCell>
                        <TableCell>{formatDate(center.last_refurbishment_date)}</TableCell>
                        <TableCell>{center.refurbishment_frequency_months} months</TableCell>
                        <TableCell>{getEligibilityBadge(center.is_eligible)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Recently Refurbished Tab */}
          <TabsContent value="recent" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Recently Refurbished ({pagination.recent.total})</CardTitle>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePreviousPage('recent')}
                      disabled={pagination.recent.offset === 0}
                    >
                      Previous
                    </Button>
                    <span className="text-sm text-gray-600">
                      {pagination.recent.offset + 1} -{' '}
                      {Math.min(
                        pagination.recent.offset + pagination.recent.limit,
                        pagination.recent.total
                      )}{' '}
                      of {pagination.recent.total}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleNextPage('recent')}
                      disabled={
                        pagination.recent.offset + pagination.recent.limit >=
                        pagination.recent.total
                      }
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Center Name</TableHead>
                      <TableHead>Partner</TableHead>
                      <TableHead>Region</TableHead>
                      <TableHead>City</TableHead>
                      <TableHead>Refurbished On</TableHead>
                      <TableHead>Months Ago</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentlyRefurbished.map((center) => (
                      <TableRow key={center.id}>
                        <TableCell className="font-medium">{center.center_name}</TableCell>
                        <TableCell>{center.organization_name}</TableCell>
                        <TableCell>{center.region}</TableCell>
                        <TableCell>{center.city}</TableCell>
                        <TableCell>{formatDate(center.last_refurbishment_date)}</TableCell>
                        <TableCell>
                          <span className="text-green-600 font-medium">
                            {center.months_since_last} months ago
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default RefurbishmentDashboard;
