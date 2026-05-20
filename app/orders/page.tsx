'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import {
  FiDownload,
  FiChevronDown,
  FiChevronUp,
  FiPlus,
  FiAlertCircle,
} from 'react-icons/fi'

interface OrderItem {
  id: string
  productName: string
  quantity: number
  price: number
  subtotal: number
}

interface Order {
  id: string
  orderNumber: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED' | 'CANCELLED'
  totalAmount: number
  createdAt: string
  approvedAt?: string
  completedAt?: string
  items: OrderItem[]
  rejectionReason?: string
  paymentMethod: 'BANK_TRANSFER' | 'CASH_ON_DELIVERY'
  invoiceUrl?: string
}

export default function OrdersPage() {
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null)
  const [invoiceModal, setInvoiceModal] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)

  useEffect(() => {
    fetchOrders()
  }, [])

  const fetchOrders = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/orders')
      if (response.ok) {
        const data = await response.json()
        setOrders(data)
      }
    } catch (error) {
      console.error('Error fetching orders:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (
    status: string
  ): 'bg-yellow-100 text-yellow-700' | 'bg-green-100 text-green-700' | 'bg-red-100 text-red-700' | 'bg-secondary-100 text-secondary-700' => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-700'
      case 'APPROVED':
      case 'COMPLETED':
        return 'bg-green-100 text-green-700'
      case 'REJECTED':
      case 'CANCELLED':
        return 'bg-red-100 text-red-700'
      default:
        return 'bg-secondary-100 text-secondary-700'
    }
  }

  const handleDownloadInvoice = async (orderId: string) => {
    try {
      const response = await fetch(`/api/orders/${orderId}/invoice`)
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `invoice-${orderId}.pdf`
        link.click()
      }
    } catch (error) {
      console.error('Error downloading invoice:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary-50">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-4">⏳</div>
          <p className="text-secondary-700 font-semibold">Loading orders...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-secondary-50">
      {/* Header */}
      <div className="bg-white border-b border-secondary-200 px-6 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-secondary-900">Orders</h1>
              <p className="text-secondary-600 mt-1">
                View and manage your procurement orders
              </p>
            </div>
            <Button onClick={() => router.push('/products')}>
              <FiPlus /> New Order
            </Button>
          </div>
        </div>
      </div>

      {/* Orders List */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {orders.length > 0 ? (
          <div className="space-y-4">
            {orders.map((order) => (
              <div
                key={order.id}
                className="bg-white border border-secondary-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow"
              >
                {/* Order Header */}
                <div
                  onClick={() =>
                    setExpandedOrder(
                      expandedOrder === order.id ? null : order.id
                    )
                  }
                  className="p-6 cursor-pointer hover:bg-secondary-50 transition-colors flex items-center justify-between"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-2">
                      <h3 className="font-bold text-lg text-secondary-900">
                        Order #{order.orderNumber}
                      </h3>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(
                          order.status
                        )}`}
                      >
                        {order.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-6 text-sm text-secondary-600">
                      <span>
                        Date: {new Date(order.createdAt).toLocaleDateString()}
                      </span>
                      <span className="font-semibold text-secondary-900">
                        Total: ${order.totalAmount.toFixed(2)}
                      </span>
                      <span>
                        Items: {order.items.reduce((sum, item) => sum + item.quantity, 0)}
                      </span>
                    </div>
                  </div>
                  {expandedOrder === order.id ? (
                    <FiChevronUp className="w-5 h-5 text-secondary-600" />
                  ) : (
                    <FiChevronDown className="w-5 h-5 text-secondary-600" />
                  )}
                </div>

                {/* Order Details */}
                {expandedOrder === order.id && (
                  <div className="border-t border-secondary-200 p-6 bg-secondary-50">
                    {/* Items */}
                    <div className="mb-6">
                      <h4 className="font-semibold text-secondary-900 mb-3">
                        Order Items
                      </h4>
                      <div className="space-y-2">
                        {order.items.map((item) => (
                          <div
                            key={item.id}
                            className="flex justify-between items-center py-2 px-3 bg-white rounded border border-secondary-200"
                          >
                            <div>
                              <p className="font-medium text-secondary-900">
                                {item.productName}
                              </p>
                              <p className="text-sm text-secondary-600">
                                Qty: {item.quantity} × ${item.price.toFixed(2)}
                              </p>
                            </div>
                            <p className="font-bold text-secondary-900">
                              ${item.subtotal.toFixed(2)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Order Summary */}
                    <div className="bg-white rounded border border-secondary-200 p-4 mb-6">
                      <div className="flex justify-between items-center py-2">
                        <span className="text-secondary-700">Subtotal:</span>
                        <span className="font-semibold text-secondary-900">
                          ${order.totalAmount.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-t border-secondary-200">
                        <span className="font-semibold text-secondary-900">Total:</span>
                        <span className="font-bold text-lg text-primary-600">
                          ${order.totalAmount.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    {/* Rejection Reason */}
                    {order.status === 'REJECTED' && order.rejectionReason && (
                      <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
                        <FiAlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold text-red-900 mb-1">
                            Rejection Reason:
                          </p>
                          <p className="text-red-800">
                            {order.rejectionReason}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Payment Info */}
                    <div className="mb-6">
                      <p className="text-sm text-secondary-700">
                        <span className="font-semibold">Payment Method:</span>{' '}
                        {order.paymentMethod === 'BANK_TRANSFER'
                          ? 'Bank Transfer'
                          : 'Cash on Delivery'}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3">
                      {order.status === 'COMPLETED' && (
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedOrder(order)
                            setInvoiceModal(true)
                          }}
                        >
                          <FiDownload /> View Invoice
                        </Button>
                      )}
                      {order.status === 'REJECTED' && (
                        <Button
                          size="sm"
                          onClick={() => router.push('/products')}
                        >
                          <FiPlus /> Reorder
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setExpandedOrder(null)}
                      >
                        Close
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md p-12 text-center border border-secondary-200">
            <p className="text-secondary-600 text-lg mb-4">No orders yet</p>
            <Button onClick={() => router.push('/products')}>
              <FiPlus /> Start Shopping
            </Button>
          </div>
        )}
      </div>

      {/* Invoice Modal */}
      <Modal
        isOpen={invoiceModal}
        title="Order Invoice"
        onClose={() => {
          setInvoiceModal(false)
          setSelectedOrder(null)
        }}
      >
        {selectedOrder && (
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-sm text-secondary-600 mb-2">Invoice for</p>
              <p className="font-bold text-lg text-secondary-900">
                Order #{selectedOrder.orderNumber}
              </p>
            </div>
            <div className="bg-secondary-50 p-4 rounded-lg">
              <p className="text-sm text-secondary-700 mb-2">
                <span className="font-semibold">Date:</span>{' '}
                {new Date(selectedOrder.createdAt).toLocaleDateString()}
              </p>
              <p className="text-sm text-secondary-700 mb-2">
                <span className="font-semibold">Total Amount:</span> $
                {selectedOrder.totalAmount.toFixed(2)}
              </p>
              <p className="text-sm text-secondary-700">
                <span className="font-semibold">Status:</span>{' '}
                {selectedOrder.status}
              </p>
            </div>
            <Button
              className="w-full"
              onClick={() => handleDownloadInvoice(selectedOrder.id)}
            >
              <FiDownload /> Download Invoice PDF
            </Button>
          </div>
        )}
      </Modal>
    </div>
  )
}
