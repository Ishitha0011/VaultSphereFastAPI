import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AppBar,
  Box,
  Button,
  Container,
  CssBaseline,
  Grid,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Toolbar,
  Typography,
  LinearProgress,
  Card,
  CardContent,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import { createTheme, ThemeProvider } from '@mui/material/styles';
import {
  CloudUpload,
  Folder,
  CreateNewFolder,
  Delete,
  Brightness4,
  Brightness7,
  ContentCopy,
  ArrowBack
} from '@mui/icons-material';
import { getRESTApi, postBinFile } from '../restutils/restapihelper';
import { useDropzone } from 'react-dropzone';

const Index = () => {
  const navigate = useNavigate();
  const [files, setFiles] = useState([]);
  const [darkMode, setDarkMode] = useState(false);
  const [folders, setFolders] = useState([
    { id: 1, name: 'Images' },
    { id: 2, name: 'Documents' },
    { id: 3, name: 'Downloads' }
  ]);
  const [currentFolder, setCurrentFolder] = useState(null);
  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  const theme = createTheme({
    palette: {
      mode: darkMode ? 'dark' : 'light',
      primary: {
        main: darkMode ? '#90caf9' : '#A7C7E7',
      },
      secondary: {
        main: darkMode ? '#A64D79' : '#F5E1DA',
      },
      background: {
        default: darkMode ? '#121212' : '#FBF8F1',
        paper: darkMode ? '#1e1e1e' : '#FFFFFF',
      },
      text: {
        primary: darkMode ? '#ffffff' : '#4A4A4A',
        secondary: darkMode ? '#b0b0b0' : '#757575',
      },
    },
    shape: {
      borderRadius: 12,
    },
  });

  useEffect(() => {
    fetchFiles();
  }, [currentFolder]);

  const fetchFiles = () => {
    getRESTApi("/rest/files/ISO")
      .then((response) => {
        setFiles(response["result"]["data"]);
      })
      .catch((err) => {
        console.error(err);
      });
  };

  const handleCreateFolder = () => {
    if (newFolderName.trim()) {
      const newFolder = {
        id: folders.length + 1,
        name: newFolderName.trim()
      };
      setFolders([...folders, newFolder]);
      setNewFolderName('');
      setShowNewFolderDialog(false);
    }
  };

  const handleThemeToggle = () => {
    setDarkMode(!darkMode);
  };

  const handleDeleteFile = (filename) => {
    setFiles(files.filter(file => file.filename !== filename));
    // Add API call to delete file here
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppBar position="fixed" color="primary" elevation={0}>
        <Toolbar>
          <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
            {currentFolder && (
              <IconButton color="inherit" onClick={() => setCurrentFolder(null)} sx={{ mr: 1 }}>
                <ArrowBack />
              </IconButton>
            )}
            <Typography variant="h6" noWrap>
              VaultSphere File Manager
              {currentFolder && ` > ${currentFolder.name}`}
            </Typography>
          </Box>
          <IconButton onClick={handleThemeToggle} color="inherit">
            {darkMode ? <Brightness7 /> : <Brightness4 />}
          </IconButton>
          <Button color="inherit" onClick={() => navigate("/login")}>Login</Button>
        </Toolbar>
      </AppBar>

      <Box sx={{ paddingTop: 8, bgcolor: theme.palette.background.default, minHeight: '100vh' }}>
        <Container maxWidth="lg" sx={{ paddingY: 3 }}>
          <Grid container spacing={3}>
            {/* Left Sidebar - Folder Management */}
            <Grid item xs={12} md={3}>
              <Card variant="outlined" sx={{ height: '100%' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6">Folders</Typography>
                    <IconButton onClick={() => setShowNewFolderDialog(true)} color="primary">
                      <CreateNewFolder />
                    </IconButton>
                  </Box>
                  <List>
                    {folders.map((folder) => (
                      <ListItemButton
                        key={folder.id}
                        selected={currentFolder?.id === folder.id}
                        onClick={() => setCurrentFolder(folder)}
                      >
                        <ListItemIcon>
                          <Folder color="primary" />
                        </ListItemIcon>
                        <ListItemText primary={folder.name} />
                      </ListItemButton>
                    ))}
                  </List>
                </CardContent>
              </Card>
            </Grid>

            {/* Main Content Area */}
            <Grid item xs={12} md={9}>
              <Grid container spacing={3}>
                {/* Upload Section */}
                <Grid item xs={12}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h6" gutterBottom>Upload Files</Typography>
                      <MainContent
                        files_list={files}
                        setFiles={setFiles}
                        fetchFiles={fetchFiles}
                        theme={theme}
                        currentFolder={currentFolder}
                      />
                    </CardContent>
                  </Card>
                </Grid>

                {/* Files Table */}
                <Grid item xs={12}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        {currentFolder ? `Files in ${currentFolder.name}` : 'All Files'}
                      </Typography>
                      <FileTable
                        files_list={files}
                        theme={theme}
                        onDelete={handleDeleteFile}
                      />
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* New Folder Dialog */}
      <Dialog open={showNewFolderDialog} onClose={() => setShowNewFolderDialog(false)}>
        <DialogTitle>Create New Folder</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Folder Name"
            fullWidth
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowNewFolderDialog(false)}>Cancel</Button>
          <Button onClick={handleCreateFolder} color="primary">Create</Button>
        </DialogActions>
      </Dialog>
    </ThemeProvider>
  );
};

const MainContent = ({ files_list, setFiles, fetchFiles, theme, currentFolder }) => {
  const [uploads, setUploads] = useState([]);

  const handleResetProgress = () => {
    setUploads([]);
  };

  const onDrop = (acceptedFiles) => {
    const newUploads = acceptedFiles.map(file => ({
      file,
      progress: 0,
      currentSize: 0,
      totalSize: file.size,
      status: 'uploading'
    }));

    setUploads([...uploads, ...newUploads]);

    acceptedFiles.forEach((file, index) => {
      postBinFile(
        { file: file.name, type: file.type, folder: currentFolder?.id },
        file,
        (event) => {
          const data = event.result.data;
          setUploads(prevUploads => {
            const newUploads = [...prevUploads];
            const uploadIndex = newUploads.findIndex(u => u.file === file);
            if (uploadIndex !== -1) {
              newUploads[uploadIndex] = {
                ...newUploads[uploadIndex],
                currentSize: data["end"],
                progress: Math.floor((data["end"] * 100) / data["size"])
              };
            }
            return newUploads;
          });
        },
        (err) => {
          if (err) {
            console.error("Error uploading file: ", err);
            return;
          }
          setUploads(prevUploads => {
            const newUploads = [...prevUploads];
            const uploadIndex = newUploads.findIndex(u => u.file === file);
            if (uploadIndex !== -1) {
              newUploads[uploadIndex].status = 'completed';
            }
            return newUploads;
          });
          fetchFiles();
        }
      );
    });
  };

  const { getRootProps, getInputProps } = useDropzone({ onDrop });

  return (
    <>
      <Box
        {...getRootProps()}
        sx={{
          border: '2px dashed',
          borderColor: theme.palette.primary.main,
          borderRadius: 1.2,
          padding: 4,
          textAlign: 'center',
          backgroundColor: theme.palette.background.paper,
          transition: 'background-color 0.3s ease',
          '&:hover': {
            backgroundColor: theme.palette.grey[100],
          },
        }}
      >
        <input {...getInputProps()} />
        <Typography variant="body1" color="textSecondary">
          Drag & drop files here, or click to select files
          {currentFolder && ` for ${currentFolder.name}`}
        </Typography>
      </Box>

      {uploads.length > 0 && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle1" gutterBottom>Upload Progress</Typography>
          {uploads.map((upload, index) => (
            <Box key={index} sx={{ mb: 2 }}>
              <Typography variant="body2">
                {upload.file.name} ({Math.round(upload.currentSize / 1024)}KB of {Math.round(upload.totalSize / 1024)}KB)
              </Typography>
              <LinearProgress variant="determinate" value={upload.progress} sx={{ mt: 1 }} />
            </Box>
          ))}
          <Button
            onClick={handleResetProgress}
            variant="contained"
            color="primary"
            sx={{ mt: 2 }}
          >
            Clear Completed Uploads
          </Button>
        </Box>
      )}
    </>
  );
};

const FileTable = ({ files_list, theme, onDelete }) => {
  const getChipColor = (type) => {
    switch (type.toLowerCase()) {
      case "pdf":
        return "primary";
      case "txt":
        return "success";
      case "csv":
        return "warning";
      case "xls":
      case "xlsx":
        return "info";
      case "iso":
      case "zip":
        return "secondary";
      default:
        return "default";
    }
  };

  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>File Name</TableCell>
            <TableCell>Type</TableCell>
            <TableCell align="center">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {files_list.map((datum) => (
            <TableRow key={datum.filename}>
              <TableCell>
                <a
                  href={datum.url}
                  style={{
                    color: theme.palette.text.primary,
                    textDecoration: 'none'
                  }}
                >
                  {datum.filename}
                </a>
              </TableCell>
              <TableCell>
                <Chip
                  label={datum.type.toUpperCase()}
                  color={getChipColor(datum.type)}
                  sx={{ fontWeight: 'bold' }}
                />
              </TableCell>
              <TableCell>
                <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
                  <Button
                    onClick={() => { navigator.clipboard.writeText(datum.url); }}
                    variant="contained"
                    color="secondary"
                    startIcon={<ContentCopy />}
                    size="small"
                  >
                    Copy URL
                  </Button>
                  <IconButton
                    onClick={() => onDelete(datum.filename)}
                    color="error"
                    size="small"
                  >
                    <Delete />
                  </IconButton>
                </Box>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default Index;