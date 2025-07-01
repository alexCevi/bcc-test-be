const express = require('express');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = 'ThisIsASecretKey10101010';

// --- Middleware ---
app.use(cors());
app.use(bodyParser.json());

// Artificial delay to simulate network latency
app.use((req, res, next) => {
  setTimeout(next, Math.random() * 500 + 100); // Random delay between 100ms and 600ms
});

// --- In-Memory Data Stores ---
let users = [
  { email: 'employee@testing.com', password: 'testing99', role: 'EMPLOYEE' },
  { email: 'supervisor@testing.com', password: 'testing00!', role: 'SUPERVISOR' },
];

let requests = [
  { id: 1, description: 'New office chair', budget: 300, expectedDate: '2025-08-15', status: 'Approved', employeeName: 'employee@testing.com' },
  { id: 2, description: 'Google Cloud Professional Data Engineer', budget: 600, expectedDate: '2025-08-01', status: 'Submitted', employeeName: 'employee@testing.com' },
  { id: 3, description: 'AWS Certified Solutions Architect - Associate', budget: 1200, expectedDate: '2025-09-01', status: 'Draft', employeeName: 'employee@testing.com' },
  { id: 4, description: 'Microsoft Certified: Azure AI Fundamentals', budget: 850, expectedDate: '2025-07-25', status: 'Rejected', employeeName: 'employee@testing.com' },
  { id: 5, description: 'AWS Certified Cloud Practitioner', budget: 700, expectedDate: '2025-08-20', status: 'Approved', employeeName: 'employee@testing.com' },
];
let nextRequestId = 6;

// --- Auth Middleware ---
const authGuard = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authentication token is required.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    // Find user from token payload to ensure they still exist
    const user = users.find(u => u.email === decoded.email);
    if (!user) {
        return res.status(401).json({ message: 'User not found.' });
    }
    req.user = user; // Attach full user object
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token.' });
  }
};

// --- Auth Endpoints ---
app.get('/auth/validate', (req, res) => {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authentication token is required.' })
  }

  const token = authHeader.split(' ')[1]
  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    // Find user from token payload to ensure they still exist
    const user = users.find(u => u.email === decoded.email)
    if (!user) return res.status(401).json({ message: 'User not found.' })
    res.json({ email: user.email, role: user.role })
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token.' })
  }
})


app.post('/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  const user = users.find(u => u.email === email);
  if (!user || user.password !== password) {
    return res.status(401).json({ message: 'Invalid credentials.' });
  }

  const token = jwt.sign({ email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '1h' });
  res.json({ token, role: user.role, email: user.email });
});

app.get('/me', authGuard, (req, res) => {
  res.json(req.user);
});

// Optional: Logout is typically handled client-side by deleting the token.
// A server-side implementation would require a token blacklist.
app.post('/logout', (req, res) => {
    res.json({ message: 'Logged out successfully. Please clear your token.' });
});


// --- Certifications CRUD ---
const certificationsRouter = express.Router();
certificationsRouter.use(authGuard); // Secure all /certifications routes

// GET /certifications - List all certifications with filtering and sorting
certificationsRouter.get('/', (req, res) => {
  let filteredRequests = [...requests];
  const { status, employeeName, minBudget, maxBudget, sortBy } = req.query;

  // Filtering
  if (status) {
    const statusFilters = status.split(',');
    filteredRequests = filteredRequests.filter(r => statusFilters.includes(r.status));
  }
  if (employeeName) {
    filteredRequests = filteredRequests.filter(r => r.employeeName.toLowerCase() === employeeName.toLowerCase());
  }
  if (minBudget) {
    filteredRequests = filteredRequests.filter(r => r.budget >= parseFloat(minBudget));
  }
  if (maxBudget) {
    filteredRequests = filteredRequests.filter(r => r.budget <= parseFloat(maxBudget));
  }

  // Sorting
  if (sortBy) {
    const [field, order] = sortBy.split(':');
    if (field && order) {
        filteredRequests.sort((a, b) => {
            const valA = a[field];
            const valB = b[field];

            if (valA < valB) return order === 'asc' ? -1 : 1;
            if (valA > valB) return order === 'asc' ? 1 : -1;
            return 0;
        });
    }
  }

  res.json(filteredRequests);
});

// POST /certifications - Create a new certification request
certificationsRouter.post('/', (req, res) => {
  const { description, budget, expectedDate } = req.body;
  const employeeName = req.user.email; // Assign request to the logged-in user

  // Validation
  if (!description || !budget || !expectedDate) {
    return res.status(400).json({ message: 'description, budget, and expectedDate are required.' });
  }
  if (isNaN(parseFloat(budget)) || parseFloat(budget) <= 0) {
    return res.status(400).json({ message: 'Budget must be a positive number.' });
  }
  if (new Date(expectedDate) < new Date().setHours(0,0,0,0)) {
      return res.status(400).json({ message: 'expectedDate cannot be in the past.' });
  }

  const newRequest = {
    id: nextRequestId++,
    description,
    budget: parseFloat(budget),
    expectedDate,
    status: 'Draft',
    employeeName,
  };

  requests.push(newRequest);
  res.status(201).json(newRequest);
});

// PATCH /requests/:id/status - Update a request's status
const validTransitions = {
    'Draft': ['Submitted'],
    'Submitted': ['Approved', 'Rejected']
};

certificationsRouter.patch('/:id/status', (req, res) => {
  const { status: newStatus } = req.body;
  const requestId = parseInt(req.params.id, 10);

  if (!newStatus) {
      return res.status(400).json({ message: 'New status is required.' });
  }

  const requestIndex = requests.findIndex(r => r.id === requestId);
  if (requestIndex === -1) {
    return res.status(404).json({ message: `Request with ID ${requestId} not found.` });
  }

  const request = requests[requestIndex];
  const currentStatus = request.status;

  // Only supervisors can approve/reject
  if ((newStatus === 'Approved' || newStatus === 'Rejected') && req.user.role !== 'SUPERVISOR') {
    return res.status(403).json({ message: 'Only supervisors can approve or reject requests.' });
  }

  // Check for valid state transition
  const allowedTransitions = validTransitions[currentStatus];
  if (!allowedTransitions || !allowedTransitions.includes(newStatus)) {
      return res.status(400).json({ message: `Cannot transition from ${currentStatus} to ${newStatus}.` });
  }

  // Update status
  requests[requestIndex].status = newStatus;
  res.json(requests[requestIndex]);
});

app.use('/certifications', certificationsRouter);


// --- Server Start ---
app.listen(PORT, () => {
  console.log(`Mock API server running on http://localhost:${PORT}`);
  console.log('Available users:');
  console.table(users.map(u => ({ email: u.email, password: u.password, role: u.role })));
});