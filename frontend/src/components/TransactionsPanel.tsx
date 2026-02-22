import { useState, useMemo, useCallback, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchTransactions, fetchFilterOptions } from "../api";
import type { RuleWithStats } from "../types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const ALL = "__all__";

interface Props {
  selectedRuleId: string | null;
  selectedRule: RuleWithStats | null;
  selectedTxnId: string | null;
  onSelectTxn: (id: string) => void;
}

const PAGE_SIZE = 50;

export default function TransactionsPanel({
  selectedRuleId,
  selectedRule,
  selectedTxnId,
  onSelectTxn,
}: Props) {
  const [offset, setOffset] = useState(0);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [firedFilter, setFiredFilter] = useState("");
  const [countryFilter, setCountryFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  const debounceTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const handleSearch = useCallback(
    (val: string) => {
      setSearch(val);
      clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(() => {
        setDebouncedSearch(val);
        setOffset(0);
      }, 300);
    },
    []
  );

  const { data: filterOpts } = useQuery({
    queryKey: ["filter_options"],
    queryFn: fetchFilterOptions,
  });

  const params = useMemo(() => {
    const p: Record<string, string> = {
      offset: String(offset),
      limit: String(PAGE_SIZE),
    };
    if (debouncedSearch) p.query = debouncedSearch;
    if (countryFilter) p.merchant_country = countryFilter;
    if (typeFilter) p.transaction_type = typeFilter;
    if (selectedRuleId && firedFilter) {
      p.rule_id = selectedRuleId;
      p.fired = firedFilter;
    }
    return p;
  }, [offset, debouncedSearch, selectedRuleId, firedFilter, countryFilter, typeFilter]);

  const { data, isLoading } = useQuery({
    queryKey: ["transactions", params],
    queryFn: () => fetchTransactions(params),
    placeholderData: (prev) => prev,
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;

  return (
    <div className="flex flex-col flex-1 min-w-0 border-r overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-card border-b shrink-0">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Transactions
        </h2>
        <span className="text-xs text-muted-foreground">
          {total.toLocaleString()} results
        </span>
      </div>

      {/* Rule stats bar */}
      {selectedRule && (
        <div className="flex items-center gap-4 px-4 py-2.5 bg-card border-b text-xs shrink-0">
          <span>
            <span className="text-muted-foreground">Fired:</span>{" "}
            <span className="font-semibold text-destructive">
              {selectedRule.fired_count.toLocaleString()}
            </span>
          </span>
          <span>
            <span className="text-muted-foreground">Not fired:</span>{" "}
            <span className="font-semibold text-emerald-500">
              {selectedRule.not_fired_count.toLocaleString()}
            </span>
          </span>
          <div
            className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden"
            title={`${(selectedRule.fire_rate * 100).toFixed(1)}% fire rate`}
          >
            <div
              className="h-full bg-destructive rounded-full transition-all duration-300"
              style={{ width: `${selectedRule.fire_rate * 100}%` }}
            />
          </div>
          <span className="font-semibold">{(selectedRule.fire_rate * 100).toFixed(1)}%</span>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 px-4 py-2.5 bg-card border-b shrink-0">
        <Input
          type="text"
          placeholder="Search ID, merchant, city, sender..."
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          className="h-8 text-sm flex-1 min-w-[160px]"
        />
        <Select
          value={countryFilter || ALL}
          onValueChange={(v) => { setCountryFilter(v === ALL ? "" : v); setOffset(0); }}
        >
          <SelectTrigger size="sm" className="w-auto min-w-[120px]">
            <SelectValue placeholder="All countries" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All countries</SelectItem>
            {filterOpts?.countries.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={typeFilter || ALL}
          onValueChange={(v) => { setTypeFilter(v === ALL ? "" : v); setOffset(0); }}
        >
          <SelectTrigger size="sm" className="w-auto min-w-[120px]">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All types</SelectItem>
            {filterOpts?.transaction_types.map((t) => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedRuleId && (
          <Select
            value={firedFilter || ALL}
            onValueChange={(v) => { setFiredFilter(v === ALL ? "" : v); setOffset(0); }}
          >
            <SelectTrigger size="sm" className="w-auto min-w-[100px]">
              <SelectValue placeholder="All (rule)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All (rule)</SelectItem>
              <SelectItem value="true">Fired</SelectItem>
              <SelectItem value="false">Not fired</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {isLoading && items.length === 0 ? (
          <div className="flex items-center justify-center gap-2 p-8 text-muted-foreground text-sm">
            <span className="inline-block size-4 border-2 border-muted-foreground/30 border-t-primary rounded-full animate-spin" />
            Loading...
          </div>
        ) : (
          <Table>
            <TableHeader className="sticky top-0 bg-card z-10">
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Date / Time</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Cur</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Merchant</TableHead>
                <TableHead>Country</TableHead>
                <TableHead>Sender</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((t) => (
                <TableRow
                  key={t.transaction_id}
                  className={cn(
                    "cursor-pointer",
                    t.transaction_id === selectedTxnId && "bg-accent"
                  )}
                  onClick={() => onSelectTxn(t.transaction_id)}
                >
                  <TableCell className="font-mono text-xs">{t.transaction_id}</TableCell>
                  <TableCell className="text-xs">{t.txn_date_time}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {t.amount.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </TableCell>
                  <TableCell>{t.currency}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-normal">
                      {t.transaction_type}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span>{t.merchant_description_condensed ?? "\u2014"}</span>
                      </TooltipTrigger>
                      <TooltipContent>
                        {t.merchant_description_condensed ?? "N/A"}
                      </TooltipContent>
                    </Tooltip>
                  </TableCell>
                  <TableCell>{t.merchant_country ?? "\u2014"}</TableCell>
                  <TableCell className="font-mono text-[11px]">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span>{t.sender_account_id.slice(0, 8)}&hellip;</span>
                      </TooltipTrigger>
                      <TooltipContent>{t.sender_account_id}</TooltipContent>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
              {items.length === 0 && !isLoading && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No transactions match your filters
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-4 py-2 bg-card border-t text-xs text-muted-foreground shrink-0">
        <Button
          variant="outline"
          size="xs"
          disabled={offset === 0}
          onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
        >
          Prev
        </Button>
        <span>
          Page {currentPage} of {totalPages || 1}
        </span>
        <Button
          variant="outline"
          size="xs"
          disabled={offset + PAGE_SIZE >= total}
          onClick={() => setOffset(offset + PAGE_SIZE)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
