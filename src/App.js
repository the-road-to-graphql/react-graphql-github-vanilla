import React, { Component } from 'react';
import axios from 'axios';

const axiosGitHubGraphQL = axios.create({
  baseURL: 'https://api.github.com/graphql',
  headers: {
    Authorization: `bearer ${
      process.env.REACT_APP_GITHUB_PERSONAL_ACCESS_TOKEN
    }`,
  },
});

const title = 'React GraphQL GitHub Client';

const issuesOfRepositoryQuery = `
  query ($organization: String!, $repository: String!) {
    organization(login: $organization) {
      name
      url
      repository(name: $repository) {
        id
        name
        url
        stargazers {
          totalCount
        }
        viewerHasStarred
        issues(last: 5, states: [OPEN]) {
          edges {
            cursor
            node {
              id
              title
              url
              reactions(last: 3) {
                edges {
                  node {
                    id
                    content
                  }
                }
              }
            }
          }
        }
      }
    }
  }
`;

const addReactionToIssueMutation = `
  mutation ($issueId: ID!) {
    addReaction(input:{subjectId:$issueId,content:HOORAY}) {
      reaction {
        content
      }
      subject {
        id
      }
    }
  }
`;

const addStarToRepositoryMutation = `
  mutation ($repositoryId: ID!) {
    addStar(input:{starrableId:$repositoryId}) {
      starrable {
        viewerHasStarred
      }
    }
  }
`;

const addReactionToIssue = issueId => {
  return axiosGitHubGraphQL.post('', {
    query: addReactionToIssueMutation,
    variables: { issueId },
  });
};

const addStarToRepository = repositoryId => {
  return axiosGitHubGraphQL.post('', {
    query: addStarToRepositoryMutation,
    variables: { repositoryId },
  });
};

const getIssuesOfRepository = path => {
  const [organization, repository] = path.split('/');

  return axiosGitHubGraphQL.post('', {
    query: issuesOfRepositoryQuery,
    variables: { organization, repository },
  });
};

const updatedIssue = (issue, newReaction) => {
  return {
    ...issue,
    node: {
      ...issue.node,
      reactions: {
        ...issue.node.reactions,
        edges: [...issue.node.reactions.edges, { node: newReaction }],
      },
    },
  };
};

const updatedIssueInState = mutationResult => state => {
  const { issues } = state.organization.repository;
  const { reaction, subject } = mutationResult.data.data.addReaction;

  const newReaction = { content: reaction.content, id: subject.id };

  const updatedIssues = issues.edges.map(issue => {
    if (issue.node.id === subject.id) {
      return updatedIssue(issue, newReaction);
    } else {
      return issue;
    }
  });

  return {
    ...state,
    organization: {
      ...state.organization,
      repository: {
        ...state.organization.repository,
        issues: {
          ...state.organization.repository.issues,
          edges: updatedIssues,
        },
      },
    },
  };
};

const resolveAddStarMutation = mutationResult => state => {
  const {
    viewerHasStarred,
  } = mutationResult.data.data.addStar.starrable;

  return {
    ...state,
    organization: {
      ...state.organization,
      repository: {
        ...state.organization.repository,
        viewerHasStarred,
      },
    },
  };
};

class App extends Component {
  state = {
    path: 'the-road-to-learn-react/the-road-to-learn-react',
    organization: null,
    errors: null,
  };

  componentDidMount() {
    this.onFetchFromGitHub(this.state.path);
  }

  onChange = event => {
    this.setState({ path: event.target.value });
  };

  onSubmit = event => {
    this.onFetchFromGitHub(this.state.path);

    event.preventDefault();
  };

  onFetchFromGitHub = path => {
    getIssuesOfRepository(path).then(result =>
      this.setState(() => ({
        organization: result.data.data.organization,
        errors: result.data.errors,
      })),
    );
  };

  onAddReactionToIssue = issueId => {
    addReactionToIssue(issueId).then(mutationResult =>
      this.setState(updatedIssueInState(mutationResult)),
    );
  };

  onAddStarToRepository = repositoryId => {
    addStarToRepository(repositoryId).then(mutationResult =>
      this.setState(resolveAddStarMutation(mutationResult)),
    );
  };

  render() {
    const { path, organization, errors } = this.state;

    return (
      <div>
        <h1>{title}</h1>

        <form onSubmit={this.onSubmit}>
          <label htmlFor="url">
            Show open issues for https://github.com/
          </label>
          <input
            id="url"
            type="text"
            value={path}
            onChange={this.onChange}
            style={{ width: '300px' }}
          />
          <button type="submit">Search</button>
        </form>

        <hr />

        {organization ? (
          <Organization
            organization={organization}
            errors={errors}
            onAddReactionToIssue={this.onAddReactionToIssue}
            onAddStarToRepository={this.onAddStarToRepository}
          />
        ) : (
          <p>No information yet ...</p>
        )}
      </div>
    );
  }
}

const Organization = ({
  organization,
  errors,
  onAddReactionToIssue,
  onAddStarToRepository,
}) => {
  if (errors) {
    return (
      <p>
        <strong>Something went wrong:</strong>
        {errors.map(error => error.message).join(' ')}
      </p>
    );
  }

  return (
    <div>
      <p>
        <strong>Issues from Organization:</strong>
        <a href={organization.url}>{organization.name}</a>
      </p>
      <Repository
        repository={organization.repository}
        onAddReactionToIssue={onAddReactionToIssue}
        onAddStarToRepository={onAddStarToRepository}
      />
    </div>
  );
};

const Repository = ({
  repository,
  onAddReactionToIssue,
  onAddStarToRepository,
}) => (
  <div>
    <p>
      <strong>In Repository:</strong>
      <a href={repository.url}>{repository.name}</a>
    </p>

    <button
      type="button"
      onClick={() => onAddStarToRepository(repository.id)}
    >
      {repository.viewerHasStarred ? 'Unstar' : 'Star'}
    </button>

    <ul>
      {repository.issues.edges.map(issue => (
        <li key={issue.node.id}>
          <a href={issue.node.url}>{issue.node.title}</a>

          <button
            type="button"
            onClick={() => onAddReactionToIssue(issue.node.id)}
          >
            Say "Horray"
          </button>

          <ul>
            {issue.node.reactions.edges.map(reaction => (
              <li key={reaction.node.id}>{reaction.node.content}</li>
            ))}
          </ul>
        </li>
      ))}
    </ul>
  </div>
);

export default App;
