import io

edits = [
    ("src/components/contracts/ContractDetails.tsx",
     '              <p className="mt-2 text-lg font-semibold text-ink-900 dark:text-white">${contract.agreedBudget}</p>',
     '              <p className="mt-2 text-lg font-semibold text-ink-900 dark:text-white">{formatCurrency(contract.agreedBudget)}</p>'),

    ("src/components/student/StudentWallet.tsx",
     '          value={balanceLoading ?<Skeleton className="h-10 w-24" /> : `$${Number(balanceData?.balance || 0).toFixed(2)}`}',
     '          value={balanceLoading ? <Skeleton className="h-10 w-24" /> : formatCurrency(balanceData?.balance)}'),
    ("src/components/student/StudentWallet.tsx",
     '                        ${w.amount}',
     '                        {formatCurrency(w.amount)}'),
    ("src/components/student/StudentWallet.tsx",
     '                      <TableCell className="font-semibold">${w.amount}</TableCell>',
     '                      <TableCell className="font-semibold">{formatCurrency(w.amount)}</TableCell>'),

    ("src/components/student/StudentDashboard.tsx",
     '          value={profileLoading ? <Skeleton className="h-8 w-16" /> : `$${balance}`}',
     '          value={profileLoading ? <Skeleton className="h-8 w-16" /> : formatCurrency(balance)}'),

    ("src/components/student/StudentPublicProfile.tsx",
     '                        {proposal.proposedBudget ? <p className="mt-3 text-sm text-ink-600 dark:text-ink-300">Proposed budget: ${proposal.proposedBudget}</p> : null}',
     '                        {proposal.proposedBudget ? <p className="mt-3 text-sm text-ink-600 dark:text-ink-300">Proposed budget: {formatCurrency(proposal.proposedBudget)}</p> : null}'),

    ("src/components/student/StudentContracts.tsx",
     '              <p className="mt-0.5 text-3xl font-bold tracking-tight text-brand-700 dark:text-brand-300">${balance}</p>',
     '              <p className="mt-0.5 text-3xl font-bold tracking-tight text-brand-700 dark:text-brand-300">{formatCurrency(balance)}</p>'),
    ("src/components/student/StudentContracts.tsx",
     '                  <span className="text-sm font-bold text-ink-900 dark:text-white">${contract.agreedBudget}</span>',
     '                  <span className="text-sm font-bold text-ink-900 dark:text-white">{formatCurrency(contract.agreedBudget)}</span>'),

    ("src/components/admin/AdminPayments.tsx",
     '                    <TableCell className="font-semibold">${item.amount}</TableCell>',
     '                    <TableCell className="font-semibold">{formatCurrency(item.amount)}</TableCell>'),

    ("src/components/client/ClientContracts.tsx",
     '                  <span className="text-sm font-bold text-ink-900 dark:text-white">${contract.agreedBudget}</span>',
     '                  <span className="text-sm font-bold text-ink-900 dark:text-white">{formatCurrency(contract.agreedBudget)}</span>'),

    ("src/components/client/ViewProposals.tsx",
     "                          {proposal.proposedBudget ? `$${proposal.proposedBudget}` : 'Not specified'}",
     "                          {proposal.proposedBudget ? formatCurrency(proposal.proposedBudget) : 'Not specified'}"),

    ("src/components/client/ClientWallet.tsx",
     '          value={balanceLoading ? <Skeleton className="h-10 w-24" /> : `$${Number(balanceData?.balance || 0).toFixed(2)}`}',
     '          value={balanceLoading ? <Skeleton className="h-10 w-24" /> : formatCurrency(balanceData?.balance)}'),
    ("src/components/client/ClientWallet.tsx",
     '                  <TableCell className="font-semibold">${topup.amount}</TableCell>',
     '                  <TableCell className="font-semibold">{formatCurrency(topup.amount)}</TableCell>'),

    ("src/components/client/ClientDashboard.tsx",
     '                        <span className="text-xs font-medium text-ink-600 dark:text-ink-300">${proposal.proposedBudget}</span>',
     '                        <span className="text-xs font-medium text-ink-600 dark:text-ink-300">{formatCurrency(proposal.proposedBudget)}</span>'),
]

for path, old, new in edits:
    with io.open(path, "r", encoding="utf-8") as f:
        content = f.read()
    count = content.count(old)
    if count == 0:
        print(f"[SKIP - NOT FOUND] {path}")
        print(f"    looking for: {old!r}")
        continue
    if count > 1:
        print(f"[WARNING - {count} MATCHES, replacing all] {path}")
    content = content.replace(old, new)
    with io.open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"[OK] {path}")

print("\nDone.")
