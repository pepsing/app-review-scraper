"use client"

import { useState } from "react"
import { ChevronDown, ChevronUp, Download, Star } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination"
import type { Review } from "@/lib/types"

interface ReviewsTableProps {
  reviews: Review[]
}

export function ReviewsTable({ reviews }: ReviewsTableProps) {
  const [sortField, setSortField] = useState<string>("date")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 10 // 每页显示的评论数量

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("desc")
    }
  }

  // 对评论进行排序
  const sortedReviews = [...reviews].sort((a, b) => {
    if (sortField === "date") {
      return sortDirection === "asc"
        ? new Date(a.date).getTime() - new Date(b.date).getTime()
        : new Date(b.date).getTime() - new Date(a.date).getTime()
    } else if (sortField === "rating") {
      return sortDirection === "asc" ? a.rating - b.rating : b.rating - a.rating
    }
    return 0
  })

  // 计算总页数
  const totalPages = Math.ceil(sortedReviews.length / pageSize)
  
  // 获取当前页的评论
  const paginatedReviews = sortedReviews.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  )

  // 处理页码变化
  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  // 生成页码数组
  const getPageNumbers = () => {
    const pages = []
    const maxPagesToShow = 5
    
    if (totalPages <= maxPagesToShow) {
      // 如果总页数小于等于最大显示页数，显示所有页码
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      // 总是显示第一页
      pages.push(1)
      
      // 计算中间页码的起始和结束
      let start = Math.max(2, currentPage - 1)
      let end = Math.min(totalPages - 1, currentPage + 1)
      
      // 如果当前页靠近开始，调整结束页
      if (currentPage <= 3) {
        end = Math.min(totalPages - 1, maxPagesToShow - 1)
      }
      
      // 如果当前页靠近结束，调整起始页
      if (currentPage >= totalPages - 2) {
        start = Math.max(2, totalPages - maxPagesToShow + 2)
      }
      
      // 添加省略号
      if (start > 2) {
        pages.push(-1) // 使用负数表示省略号
      }
      
      // 添加中间页码
      for (let i = start; i <= end; i++) {
        pages.push(i)
      }
      
      // 添加省略号
      if (end < totalPages - 1) {
        pages.push(-2) // 使用另一个负数表示省略号
      }
      
      // 总是显示最后一页
      pages.push(totalPages)
    }
    
    return pages
  }

  return (
    <div>
      <div className="flex items-center justify-end mb-4">
        <Button variant="outline" size="sm" asChild>
          <a href={`/api/export-reviews?reviews=${encodeURIComponent(JSON.stringify(sortedReviews))}`} download>
            <Download className="mr-2 h-4 w-4" />
            Export
          </a>
        </Button>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="cursor-pointer" onClick={() => handleSort("date")}>
                <div className="flex items-center">
                  Date
                  {sortField === "date" &&
                    (sortDirection === "asc" ? (
                      <ChevronUp className="ml-1 h-4 w-4" />
                    ) : (
                      <ChevronDown className="ml-1 h-4 w-4" />
                    ))}
                </div>
              </TableHead>
              <TableHead>User</TableHead>
              <TableHead className="cursor-pointer" onClick={() => handleSort("rating")}>
                <div className="flex items-center">
                  Rating
                  {sortField === "rating" &&
                    (sortDirection === "asc" ? (
                      <ChevronUp className="ml-1 h-4 w-4" />
                    ) : (
                      <ChevronDown className="ml-1 h-4 w-4" />
                    ))}
                </div>
              </TableHead>
              <TableHead>Review</TableHead>
              <TableHead>Store</TableHead>
              <TableHead>Region</TableHead>
              <TableHead>Version</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedReviews.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-4">
                  No reviews found
                </TableCell>
              </TableRow>
            ) : (
              paginatedReviews.map((review) => (
                <TableRow key={review.id}>
                  <TableCell className="whitespace-nowrap">{new Date(review.date).toLocaleDateString()}</TableCell>
                  <TableCell>{review.userName}</TableCell>
                  <TableCell>
                    <div className="flex">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`h-4 w-4 ${i < review.rating ? "text-yellow-400 fill-yellow-400" : "text-gray-300"}`}
                        />
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-md truncate">{review.text}</TableCell>
                  <TableCell>
                    <Badge variant={review.store === "app-store" ? "default" : "secondary"}>
                      {review.store === "app-store" ? "App Store" : "Play Store"}
                    </Badge>
                  </TableCell>
                  <TableCell>{review.region}</TableCell>
                  <TableCell>{review.version}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      
      {totalPages > 1 && (
        <Pagination className="mt-4">
          <PaginationContent>
            {currentPage > 1 && (
              <PaginationItem>
                <PaginationPrevious 
                  href="#" 
                  onClick={(e) => {
                    e.preventDefault()
                    handlePageChange(currentPage - 1)
                  }} 
                />
              </PaginationItem>
            )}
            
            {getPageNumbers().map((page, index) => (
              <PaginationItem key={index}>
                {page < 0 ? (
                  <PaginationEllipsis />
                ) : (
                  <PaginationLink 
                    href="#" 
                    isActive={page === currentPage}
                    onClick={(e) => {
                      e.preventDefault()
                      handlePageChange(page)
                    }}
                  >
                    {page}
                  </PaginationLink>
                )}
              </PaginationItem>
            ))}
            
            {currentPage < totalPages && (
              <PaginationItem>
                <PaginationNext 
                  href="#" 
                  onClick={(e) => {
                    e.preventDefault()
                    handlePageChange(currentPage + 1)
                  }} 
                />
              </PaginationItem>
            )}
          </PaginationContent>
        </Pagination>
      )}
    </div>
  )
}

