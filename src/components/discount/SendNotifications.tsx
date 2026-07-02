import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Send, Users, Search } from "lucide-react";
import { toast } from "sonner";
import { offerApi } from "@/services/offerApi";
import { categoryApi } from "@/services/categoryApi";
import { staffApi } from "@/services/staffApi";
import { SendMessageDialog } from "./SendMessageDialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import IndividualNotificationPanel from "./IndividualNotificationPanel";
import SentNotificationsHistory from "./SentNotificationsHistory";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

interface OfferWithCategories {
  id: string;
  name: string;
  description: string;
  valid_from: string;
  valid_to: string;
  is_active: boolean;
  categories: Array<{
    id: number;
    name: string;
    memberCount: number;
  }>;
  totalMembers: number;
  is_recurrent?: boolean;
  usage_limit?: number | null;
}

const SendNotifications = () => {
  const [offers, setOffers] = useState<OfferWithCategories[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState<OfferWithCategories | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    loadOffersWithCategories();
  }, []);

  const loadOffersWithCategories = async () => {
    setLoading(true);
    try {
      const offersData = await offerApi.getOffers();
      const categoriesData = await categoryApi.getCategories();
      
      // For each offer, get its categories and count members
      const offersWithCategories = await Promise.all(
        offersData.map(async (offer) => {
          const categoryIds = await offerApi.getOfferCategories(offer.id);
          
          // Get member count for each category
          const categoriesWithCounts = await Promise.all(
            categoryIds.map(async (categoryId) => {
              const categoryInfo = categoriesData.find(c => c.id === categoryId);
              
              const membersResp = await staffApi.getStaff({
                category_id: categoryId.toString(),
                is_active: true,
                limit: 1
              });

              return {
                id: categoryId,
                name: categoryInfo?.name || 'Unknown',
                memberCount: membersResp.pagination?.total || 0,
              };
            })
          );

          const totalMembers = categoriesWithCounts.reduce(
            (sum, cat) => sum + cat.memberCount,
            0
          );

          return {
            id: offer.id,
            name: offer.name,
            description: offer.description || '',
            valid_from: offer.valid_from,
            valid_to: offer.valid_to,
            is_active: offer.is_active,
            categories: categoriesWithCounts,
            totalMembers,
            is_recurrent: offer.is_recurrent,
            usage_limit: offer.usage_limit,
          };
        })
      );

      setOffers(offersWithCategories);
    } catch (error) {
      console.error('Error loading offers with categories:', error);
      toast.error('Failed to load offers and categories');
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = (offer: OfferWithCategories) => {
    setSelectedOffer(offer);
    setIsDialogOpen(true);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Filter offers based on search query
  const filteredOffers = useMemo(() => {
    if (!searchQuery.trim()) return offers;
    
    const query = searchQuery.toLowerCase();
    return offers.filter(offer => 
      offer.name.toLowerCase().includes(query) ||
      offer.description.toLowerCase().includes(query) ||
      offer.categories.some(cat => cat.name.toLowerCase().includes(query))
    );
  }, [offers, searchQuery]);

  // Paginate filtered offers
  const paginatedOffers = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredOffers.slice(startIndex, endIndex);
  }, [filteredOffers, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredOffers.length / itemsPerPage);

  // Reset to page 1 when search query changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            <div>
              <CardTitle>Send Notifications</CardTitle>
              <CardDescription>
                Send SMS or WhatsApp notifications to member groups, categories or individuals.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs defaultValue="reminders" className="w-full">
            <TabsList className="grid w-full grid-cols-3 max-w-xl mb-6">
              <TabsTrigger value="reminders">Offer Reminders</TabsTrigger>
              {/* <TabsTrigger value="categories">By Category</TabsTrigger> */}
              <TabsTrigger value="individuals">Offer To Individual Members</TabsTrigger>
              <TabsTrigger value="history">Sent History</TabsTrigger>
            </TabsList>

            {/* Tab 1: Offer Reminders */}
            <TabsContent value="reminders" className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <div className="relative w-80">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search offers..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <p className="text-muted-foreground">Loading offers...</p>
                </div>
              ) : filteredOffers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    {searchQuery ? "No offers found matching your search" : "No offers available"}
                  </p>
                </div>
              ) : (
                <>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[200px]">Offer Name</TableHead>
                          <TableHead className="w-[250px]">Description</TableHead>
                          <TableHead className="w-[180px]">Valid Period</TableHead>
                          <TableHead className="w-[220px]">Categories</TableHead>
                          <TableHead className="w-[120px] text-center">Total Members</TableHead>
                          <TableHead className="w-[100px]">Status</TableHead>
                          <TableHead className="w-[140px] text-right">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedOffers.map((offer) => (
                          <TableRow key={offer.id}>
                            <TableCell className="font-medium">{offer.name}</TableCell>
                            <TableCell>
                              <div className="max-w-[250px] truncate" title={offer.description}>
                                {offer.description || 'No description'}
                              </div>
                            </TableCell>
                            <TableCell className="text-sm whitespace-nowrap">
                              <div className="flex flex-col gap-0.5">
                                <span>{formatDate(offer.valid_from)}</span>
                                <span className="text-muted-foreground">to {formatDate(offer.valid_to)}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-1.5">
                                {offer.categories.map((cat) => (
                                  <div key={cat.id} className="flex items-center gap-2 text-sm">
                                    <Badge variant="outline" className="text-xs">{cat.name}</Badge>
                                    <span className="text-muted-foreground flex items-center gap-1 text-xs">
                                      <Users className="h-3 w-3" />
                                      {cat.memberCount}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant="secondary" className="font-semibold">
                                {offer.totalMembers}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant={offer.is_active ? "default" : "secondary"}>
                                {offer.is_active ? "Active" : "Inactive"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                size="sm"
                                onClick={() => handleSendMessage(offer)}
                                disabled={offer.totalMembers === 0 || !offer.is_active}
                                className="gap-2"
                              >
                                <Send className="h-4 w-4" />
                                Send
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">
                        Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredOffers.length)} of {filteredOffers.length} offers
                      </p>
                      <Pagination>
                        <PaginationContent>
                          <PaginationItem>
                            <PaginationPrevious
                              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                              className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                            />
                          </PaginationItem>
                          
                          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                            // Show first page, last page, current page, and pages around current
                            if (
                              page === 1 ||
                              page === totalPages ||
                              (page >= currentPage - 1 && page <= currentPage + 1)
                            ) {
                              return (
                                <PaginationItem key={page}>
                                  <PaginationLink
                                    onClick={() => setCurrentPage(page)}
                                    isActive={currentPage === page}
                                    className="cursor-pointer"
                                  >
                                    {page}
                                  </PaginationLink>
                                </PaginationItem>
                              );
                            } else if (page === currentPage - 2 || page === currentPage + 2) {
                              return (
                                <PaginationItem key={page}>
                                  <PaginationEllipsis />
                                </PaginationItem>
                              );
                            }
                            return null;
                          })}
                          
                          <PaginationItem>
                            <PaginationNext
                              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                              className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                            />
                          </PaginationItem>
                        </PaginationContent>
                      </Pagination>
                    </div>
                  )}
                </>
              )}
            </TabsContent>

            {/* Tab 2: By Category */}
            {/* <TabsContent value="categories" className="pt-2">
              <CategoryNotificationPanel />
            </TabsContent> */}

            {/* Tab 3: Individual Members */}
            <TabsContent value="individuals" className="pt-2">
              <IndividualNotificationPanel />
            </TabsContent>

            {/* Tab 4: Sent History */}
            <TabsContent value="history" className="pt-2">
              <SentNotificationsHistory />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {selectedOffer && (
        <SendMessageDialog
          offer={selectedOffer}
          isOpen={isDialogOpen}
          onClose={() => {
            setIsDialogOpen(false);
            setSelectedOffer(null);
          }}
        />
      )}
    </div>
  );
};

export default SendNotifications;
